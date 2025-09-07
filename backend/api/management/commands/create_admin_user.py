from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.users.models import User

class Command(BaseCommand):
    help = 'Create an admin user for PharmaGo admin portal'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='devadmin', help='Admin username')
        parser.add_argument('--password', type=str, default='dev123', help='Admin password')
        parser.add_argument('--email', type=str, default='admin@pharmago.com', help='Admin email')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user "{username}" already exists')
            )
            return
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            role=User.UserRole.ADMIN,
            status=User.UserStatus.ACTIVE,
            is_email_verified=True,
            is_phone_verified=True
        )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created admin user "{username}"')
        )
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Password: {password}')
