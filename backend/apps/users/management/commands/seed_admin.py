"""
Idempotent first-admin bootstrap for deployment.

Free Render web services have no Dashboard Shell / SSH, so `createsuperuser`
cannot be run on the box. This command lets the *build step* seed exactly one
admin from environment variables instead, and is safe to run on every deploy:

    python manage.py seed_admin

Environment variables (all optional — the command no-ops if ADMIN_PASSWORD is
unset, so it can never create an account by accident):

    ADMIN_USERNAME   login name        (default: "admin")
    ADMIN_EMAIL      optional, unique  (blank -> left NULL)
    ADMIN_PASSWORD   required to seed  (blank -> command skips)

Behaviour:
    * user missing  -> create a superuser with role=admin
    * user exists   -> repair it (role=admin, is_staff, is_superuser)
    * an existing user's password is NEVER rewritten

Why repair the role too: the React frontend only unlocks admin screens when the
logged-in user's `role == "admin"` (see frontend/src/context/AuthContext.jsx),
so a superuser whose role is still the default "student" would be able to use
the Django admin but not the app's admin screens.
"""

from decouple import config
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import User


class Command(BaseCommand):
    help = 'Create or repair the first admin account from environment variables.'

    @transaction.atomic
    def handle(self, *args, **options):
        # config() reads the real process environment first, then falls back to
        # the local .env file — so this same command works on Render (real env
        # vars) and on a developer machine (backend/.env).
        username = config('ADMIN_USERNAME', default='admin').strip() or 'admin'
        email = config('ADMIN_EMAIL', default='').strip() or None
        password = config('ADMIN_PASSWORD', default='')

        # Fail-safe: without a password we do nothing at all. This is what makes
        # the command safe to wire into a build that runs on every deploy.
        if not password:
            self.stdout.write(
                'seed_admin: ADMIN_PASSWORD not set — skipping (no changes).'
            )
            return

        user = User.objects.filter(username=username).first()
        created = user is None

        if created:
            # email is unique: drop it if another account already owns it, so a
            # repeated/typo'd value can never abort the whole deploy.
            if email and User.objects.filter(email__iexact=email).exists():
                email = None
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )

        # Repair admin capabilities on every run (idempotent).
        changed = []
        if not user.is_staff:
            user.is_staff = True
            changed.append('is_staff')
        if not user.is_superuser:
            user.is_superuser = True
            changed.append('is_superuser')
        if user.role != User.ROLE_ADMIN:
            user.role = User.ROLE_ADMIN
            changed.append('role')
        if changed:
            user.save(update_fields=changed)

        action = 'created' if created else 'repaired'
        self.stdout.write(
            self.style.SUCCESS(
                f'seed_admin: {action} admin "{username}" (role=admin).'
            )
        )
