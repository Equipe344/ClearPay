"""
Contract tests for department management (POST /api/departments/).

Departments used to be creatable only in the Django admin, so a fresh deploy
shipped with none — which blocked fee creation, blocked student registration,
and made roster imports fail on "unknown department". These lock the new
in-app creation path and its permission rules.
"""

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.users.models import Department, User


class DepartmentCreateContractTests(APITestCase):
    url = '/api/departments/'

    def setUp(self):
        self.department = Department.objects.create(
            name='Computer Science', faculty='Physical Sciences'
        )
        self.admin = User.objects.create_user(
            username='admin1', email='admin1@example.com',
            password='S7rong!Passw0rd', role=User.ROLE_ADMIN, is_staff=True,
        )
        self.student = User.objects.create_user(
            username='student1', email='student1@example.com',
            password='S7rong!Passw0rd', role=User.ROLE_STUDENT,
        )

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

    def test_get_list_is_public_and_shape_locked(self):
        # Register/signup dropdowns read this before anyone has a token.
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data[0].keys()), {'id', 'name', 'faculty'}
        )

    def test_create_rejects_anonymous(self):
        response = self.client.post(
            self.url, {'name': 'Physics', 'faculty': 'Physical Sciences'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(set(response.data.keys()), {'error', 'message'})

    def test_create_rejects_student(self):
        self._auth(self.student)
        response = self.client.post(
            self.url, {'name': 'Physics', 'faculty': 'Physical Sciences'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create(self):
        self._auth(self.admin)
        response = self.client.post(
            self.url, {'name': 'Physics', 'faculty': 'Physical Sciences'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Physics')
        self.assertTrue(Department.objects.filter(name='Physics').exists())

    def test_duplicate_name_is_case_insensitive(self):
        self._auth(self.admin)
        response = self.client.post(
            self.url,
            {'name': 'computer science', 'faculty': 'Physical Sciences'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_faculty_is_required(self):
        self._auth(self.admin)
        response = self.client.post(
            self.url, {'name': 'Physics'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
