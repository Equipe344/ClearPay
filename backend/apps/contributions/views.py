from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import IsClassRepOrAdmin

from . import payments_bridge
from .models import Contribution
from .serializers import ContributionSerializer


def _visible_contributions(user):
    """
    Contributions a user may see/own, scoped to their department.

    Students and class reps only ever reach their own department's rows;
    staff/superusers (no department today) get all rows. This is the single
    choke point that prevents cross-department IDOR on detail/summary/payments.
    """
    qs = Contribution.objects.select_related('department', 'created_by').all()
    if user.department_id:
        qs = qs.filter(department_id=user.department_id)
    elif not (user.is_staff or user.is_superuser):
        qs = qs.none()
    return qs


def _display_name(user):
    return ' '.join(p for p in (user.first_name, user.last_name) if p) or user.username


def _rep_level_error(request, contribution):
    """Refuse a class rep acting outside their own level (403, honest).

    Department scoping is already enforced by the queryset (out-of-department
    is a 404). This covers the remaining axis: a rep whose level does not
    match the fee's `target_level` must not edit, close, reopen, or mark
    students on it. General fees (no target_level) are open to every rep in
    the department. Admins/staff/superusers are never level-restricted.
    Returns an error Response, or None when the action may proceed.
    """
    if (
        request.user.role == User.ROLE_CLASS_REP
        and contribution.target_level
        and request.user.level != contribution.target_level
    ):
        return Response(
            {
                'error': 'forbidden',
                'message': 'That contribution is not for your level.',
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


class ContributionListCreateView(generics.ListCreateAPIView):
    serializer_class = ContributionSerializer

    def get_permissions(self):
        # Only class reps/admins may create (API_CONTRACT.md section 3).
        if self.request.method == 'POST':
            return [IsClassRepOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = _visible_contributions(self.request.user)

        if self.request.method == 'GET' and self.request.user.role == User.ROLE_STUDENT:
            # Students only see fees still open, and only their level.
            qs = qs.filter(Contribution.open_q())
            if self.request.user.level:
                qs = qs.filter(
                    Q(target_level__isnull=True) | Q(target_level=self.request.user.level)
                )
            else:
                qs = qs.filter(target_level__isnull=True)

        if (
            self.request.method == 'GET'
            and self.request.user.role == User.ROLE_CLASS_REP
            and self.request.user.level
        ):
            # A class rep manages their own department AND their own level: a
            # 500-level rep must not see (or act on) a 100-level-only fee, and
            # vice versa. General fees (no target_level) stay visible to all
            # reps in the department.
            qs = qs.filter(
                Q(target_level__isnull=True)
                | Q(target_level=self.request.user.level)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        target_department = serializer.validated_data.get('department')

        if user.role == User.ROLE_ADMIN or user.is_staff or user.is_superuser:
            if not target_department:
                if user.department_id:
                    target_department = user.department
                else:
                    raise serializers.ValidationError(
                        {'department_id': 'System admins must specify a department_id to create a contribution.'}
                    )
        else:
            if not user.department_id:
                raise serializers.ValidationError(
                    {'non_field_errors': 'You must belong to a department before you can create contributions.'}
                )
            target_department = user.department

        # Owner + department are ALWAYS set server-side. The client can never
        # spoof who created it or target another department without admin rights.
        # Level gate: a rep only manages their own level, so creating a fee for
        # another level is an honest 400. Admins are unrestricted.
        if (
            user.role == User.ROLE_CLASS_REP
            and not (user.is_staff or user.is_superuser)
            and serializer.validated_data.get('target_level')
            and user.level
            and serializer.validated_data.get('target_level') != user.level
        ):
            raise serializers.ValidationError(
                {'target_level': 'You can only create contributions for your own level.'}
            )
        serializer.save(department=target_department, created_by=user)


class ContributionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET is open to anyone who can see the fee; PATCH and DELETE are
    rep/admin-only, scoped to their own department.

    DELETE **closes** the fee — it never removes the row. See `perform_destroy`.
    """

    serializer_class = ContributionSerializer
    # PATCH only for writes: a half-specified PUT would let a caller blank a
    # required field by omitting it, and nothing in the contract uses PUT.
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method in ('PATCH', 'DELETE'):
            return [IsClassRepOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return _visible_contributions(self.request.user)

    def update(self, request, *args, **kwargs):
        # Level gate BEFORE the generic update runs: a rep outside the fee's
        # target_level gets an honest 403 (not a silent no-op), while admins
        # and same-level reps flow through to perform_update below.
        contribution = self.get_object()
        level_error = _rep_level_error(request, contribution)
        if level_error is not None:
            return level_error
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """
        A rep may never MOVE a fee to another department — that would let them
        hand off (or hijack) a collection they don't own. The department is
        fixed at creation and only a system admin may change it.
        """
        user = self.request.user
        if user.role == User.ROLE_ADMIN or user.is_staff or user.is_superuser:
            serializer.save()
        else:
            serializer.save(department=serializer.instance.department)

    def destroy(self, request, *args, **kwargs):
        # Same level gate for close/reopen: closing another level's fee (or
        # reopening it) is a 403 for a rep, while admins flow through.
        contribution = self.get_object()
        level_error = _rep_level_error(request, contribution)
        if level_error is not None:
            return level_error
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        """
        DELETE closes the fee instead of deleting it.

        The `Payment` rows referencing this fee are the audit trail of money
        actually collected, so destroying the fee would either be blocked
        (`created_by` is PROTECT) or orphan that record. Closing keeps every
        historical total intact while stopping new payments; set `is_closed`
        back to false through PATCH to reopen.
        """
        instance.is_closed = True
        instance.save(update_fields=['is_closed', 'updated_at'])


class ContributionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contribution = get_object_or_404(_visible_contributions(request.user), pk=pk)
        return Response(
            {
                # Money is always a 2-decimal string (frontend displays as-is).
                'total_expected': f"{contribution.total_expected():.2f}",
                'total_collected': f"{contribution.total_collected():.2f}",
                'outstanding_count': contribution.outstanding_count(),
            }
        )


class ContributionPaymentsView(APIView):
    """
    GET /contributions/{id}/payments/ — class rep/admin only.

    One row per eligible student: their payment status on this fee. Reads the
    full Payment ledger (gateway and approved self-reported rows), so the
    statuses always agree with has_paid and the collection totals.
    """

    permission_classes = [IsClassRepOrAdmin]

    def get(self, request, pk):
        contribution = get_object_or_404(_visible_contributions(request.user), pk=pk)
        status_map = payments_bridge.payment_status_map(contribution)
        rows = []
        for student in contribution.eligible_students().order_by('username'):
            payment = status_map.get(student.id) or {}
            rows.append(
                {
                    'student': _display_name(student),
                    'matric_number': student.matric_number,
                    'status': payment.get('status', 'pending'),
                    'paid_at': payment.get('paid_at'),
                }
            )
        return Response(rows)

    def post(self, request, pk):
        """
        POST /contributions/{id}/payments/ — class rep/admin only.

        Mark a student as paid WITHOUT an online gateway transaction, for when
        a student has paid offline (cash, transfer). The amount ALWAYS comes
        from the contribution, server-side — the student is never asked for a
        price.
        """
        contribution = get_object_or_404(_visible_contributions(request.user), pk=pk)
        # Level gate: a rep outside the fee's target_level gets an honest 403
        # (same rule as edit/close), while admins and same-level reps proceed.
        level_error = _rep_level_error(request, contribution)
        if level_error is not None:
            return level_error

        matric_number = request.data.get('matric_number')
        if not matric_number:
            return Response(
                {'error': 'bad_request', 'message': 'matric_number is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = User.objects.filter(matric_number=matric_number).first()
        if student is None:
            return Response(
                {'error': 'not_found', 'message': 'No student with that matric number.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        # The marked student must belong to THIS contribution's department
        # (prevents a rep from marking a student from another dept on a fee
        # they don't owe).
        if student.department_id != contribution.department_id:
            return Response(
                {'error': 'bad_request', 'message': 'Student is not in this department.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Level-targeted fees too: marking a student who does not owe this fee
        # would bank a success row we then count as collected, inflating the
        # totals with money that was never due.
        if (
            contribution.target_level
            and student.level != contribution.target_level
        ):
            return Response(
                {
                    'error': 'bad_request',
                    'message': 'This contribution does not apply to that student\'s level.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # A rep cannot mark themselves as paid — only a real admin may.
        if student.id == request.user.id and request.user.role != User.ROLE_ADMIN:
            return Response(
                {'error': 'forbidden', 'message': 'You cannot mark yourself as paid.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if payments_bridge.already_paid(contribution, student):
            return Response(
                {
                    'error': 'already_paid',
                    'message': 'This student already has a successful payment for this contribution.',
                },
                status=status.HTTP_409_CONFLICT,
            )

        receipt_reference = (request.data.get('receipt_reference') or '').strip()
        if not receipt_reference:
            return Response(
                {
                    'error': 'bad_request',
                    'message': (
                        'receipt_reference is required — quote the teller/receipt '
                        'number so offline payments can be audited.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment = payments_bridge.mark_manually_paid(
                contribution, student, request.user, receipt_reference
            )
        except ValueError as exc:
            return Response(
                {'error': 'unavailable', 'message': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                'student': _display_name(student),
                'matric_number': student.matric_number,
                'status': payment.status,
                'paid_at': payment.updated_at,
                'method': payment.method,
            },
            status=status.HTTP_201_CREATED,
        )