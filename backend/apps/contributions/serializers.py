from decimal import Decimal

from django.utils.html import strip_tags
from rest_framework import serializers

from apps.users.models import Department
from .models import Contribution


class ContributionSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
    )
    deadline = serializers.DateTimeField(allow_null=True, required=True)
    target_level = serializers.ChoiceField(
        choices=Contribution._meta.get_field('target_level').choices,
        allow_null=True,
        required=False,
    )
    has_paid = serializers.SerializerMethodField(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        required=False,
    )
    department = serializers.CharField(
        source='department.name', read_only=True
    )

    class Meta:
        model = Contribution
        # Response shape matches API_CONTRACT.md §3. `created_at` and
        # `description` are returned because the fee list/detail screens render
        # them; `department`/`department_id` are returned on EVERY row (not just
        # create) so a rep/admin can see which department each fee landed in —
        # without them, an admin's "all departments" list is indistinguishable
        # blobs and there is no way to confirm assignment.
        fields = [
            'id',
            'title',
            'description',
            'amount',
            'deadline',
            'is_mandatory',
            'target_level',
            'is_closed',
            'has_paid',
            'department',
            'department_id',
            'created_at',
        ]
        read_only_fields = ['id', 'has_paid', 'department', 'created_at']
        extra_kwargs = {
            'description': {'required': False},
        }

    def validate_amount(self, value):
        # Money rule: keep Decimal end-to-end; never float (BRIEF.md).
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_description(self, value):
        return strip_tags(value) if value else value

    def to_representation(self, instance):
        # `department`/`department_id` are server-chosen and always returned so
        # the caller can confirm which department the fee landed in. (They used
        # to be create-only; the admin's cross-department list then had no way
        # to show assignment.)
        representation = super().to_representation(instance)
        representation['department_id'] = instance.department_id
        representation['department'] = (
            instance.department.name if instance.department_id else None
        )
        return representation

    def get_has_paid(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request is not None else None
        if user is None or not getattr(user, 'is_authenticated', False):
            return False
        return obj.has_paid(user)