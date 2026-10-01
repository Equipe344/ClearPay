"""Self-reported offline payments (bank transfer / POS / cash): submit -> pending
-> rep/admin approve or reject. Locks in the feature added for the demo."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.contributions.models import Contribution
from apps.users.models import Department
from .models import Payment


User = get_user_model()


class OfflinePaymentFlowTests(APITestCase):

    def setUp(self):
        self.department = Department.objects.create(
            name='Physics', faculty='Physical Sciences'
        )
        self.student = User.objects.create_user(
            username='offline.student', email='offline.student@example.com',
            password='S7rong!Passw0rd', matric_number='PHY/2026/001',
            department=self.department, level='300',
        )
        self.rep = User.objects.create_user(
            username='offline.rep', email='rep@example.com',
            password='S7rong!Passw0rd', matric_number='PHY/2026/002',
            department=self.department, level='300', role='class_rep',
        )
        self.admin = User.objects.create_user(
            username='offline.admin', email='admin@example.com',
            password='S7rong!Passw0rd', matric_number='PHY/2026/003',
            department=self.department, level='500', role='admin',
        )
        self.contribution = Contribution.objects.create(
            department=self.department, created_by=self.admin, title='Lab Coat',
            amount=Decimal('2500.00'),
            deadline=timezone.now() + timezone.timedelta(days=30),
            is_mandatory=True,
        )
        self.student_token = Token.objects.create(user=self.student)
        self.rep_token = Token.objects.create(user=self.rep)

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def _submit(self, channel='bank_transfer'):
        proof = SimpleUploadedFile(
            'proof.png', b'fake-image-bytes', content_type='image/png'
        )
        return self.client.post(
            '/api/payments/submit/',
            {
                'contribution_id': self.contribution.id,
                'channel': channel,
                'note': 'paid at the bank',
                'proof': proof,
            },
            format='multipart',
        )

    def test_submit_creates_pending_manual_payment(self):
        self._auth(self.student_token)
        resp = self._submit()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['payment']['status'], Payment.STATUS_PENDING)
        payment = Payment.objects.get(
            student=self.student, contribution=self.contribution
        )
        self.assertEqual(payment.method, Payment.METHOD_MANUAL)
        # The amount is taken from the contribution, never the client.
        self.assertEqual(payment.amount, Decimal('2500.00'))

    def test_bad_channel_is_rejected(self):
        self._auth(self.student_token)
        resp = self._submit(channel='crypto')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rep_approve_credits_then_blocks_resubmit(self):
        self._auth(self.student_token)
        self._submit()

        self._auth(self.rep_token)
        pending = self.client.get('/api/payments/pending/')
        self.assertEqual(pending.status_code, status.HTTP_200_OK)
        self.assertEqual(pending.data['count'], 1)
        pid = pending.data['results'][0]['id']

        approve = self.client.post(
            f'/api/payments/{pid}/review/', {'action': 'approve'}, format='json'
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(pk=pid)
        self.assertEqual(payment.status, Payment.STATUS_SUCCESS)
        self.assertTrue(self.contribution.has_paid(self.student))

        # A paid fee cannot be paid again.
        self._auth(self.student_token)
        again = self._submit()
        self.assertEqual(again.status_code, status.HTTP_409_CONFLICT)

    def test_reject_marks_failed(self):
        self._auth(self.student_token)
        self._submit()

        self._auth(self.rep_token)
        pid = self.client.get('/api/payments/pending/').data['results'][0]['id']
        reject = self.client.post(
            f'/api/payments/{pid}/review/', {'action': 'reject'}, format='json'
        )
        self.assertEqual(reject.status_code, status.HTTP_200_OK)
        self.assertEqual(Payment.objects.get(pk=pid).status, Payment.STATUS_FAILED)

    def test_student_cannot_read_pending_queue(self):
        self._auth(self.student_token)
        response = self.client.get('/api/payments/pending/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
