from django.core.management.base import BaseCommand
from django.db import transaction
from api.users.models import User, Customer


class Command(BaseCommand):
    help = 'Check for and clean up duplicate Customer records'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Checking for duplicate Customer records...")
        
        # Find users with multiple customer profiles
        users_with_duplicates = []
        for user in User.objects.all():
            customer_count = Customer.objects.filter(user=user).count()
            if customer_count > 1:
                users_with_duplicates.append((user.id, user.username, customer_count))
        
        if users_with_duplicates:
            self.stdout.write(
                self.style.WARNING(f"❌ Found {len(users_with_duplicates)} users with duplicate Customer records:")
            )
            for user_id, username, count in users_with_duplicates:
                self.stdout.write(f"  - User ID {user_id} ({username}): {count} Customer records")
            
            self.stdout.write("\n🧹 Cleaning up duplicate records...")
            
            with transaction.atomic():
                for user_id, username, count in users_with_duplicates:
                    # Keep the first Customer record, delete the rest
                    customers = Customer.objects.filter(user_id=user_id).order_by('id')
                    if customers.count() > 1:
                        # Keep the first one, delete the rest
                        customers_to_delete = customers[1:]
                        for customer in customers_to_delete:
                            self.stdout.write(f"  - Deleting Customer ID {customer.id} for User {user_id}")
                            customer.delete()
            
            self.stdout.write(self.style.SUCCESS("✅ Cleanup completed!"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ No duplicate Customer records found."))
        
        # Show current state
        self.stdout.write(f"\n📊 Current state:")
        self.stdout.write(f"  - Total Users: {User.objects.count()}")
        self.stdout.write(f"  - Total Customers: {Customer.objects.count()}")
        
        # Check for users without customer profiles
        users_without_customers = User.objects.filter(customer_profile__isnull=True)
        if users_without_customers.exists():
            self.stdout.write(
                self.style.WARNING(f"  - Users without Customer profiles: {users_without_customers.count()}")
            )
            for user in users_without_customers:
                self.stdout.write(f"    - User ID {user.id} ({user.username})")
        else:
            self.stdout.write("  - All users have Customer profiles ✅")
