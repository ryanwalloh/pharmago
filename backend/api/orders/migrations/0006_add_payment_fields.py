# Generated migration for Stripe payment fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_senior_citizen_id_image_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('cod', 'Cash on Delivery'),
                    ('card', 'Card (Visa, Mastercard, etc.)'),
                    ('gcash', 'GCash'),
                    ('paymaya', 'PayMaya'),
                    ('bank_transfer', 'Bank Transfer')
                ],
                default='cod',
                help_text='Payment method selected by customer',
                max_length=50
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='stripe_payment_intent_id',
            field=models.CharField(
                blank=True,
                help_text='Stripe payment intent ID for card payments',
                max_length=255,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='stripe_payment_status',
            field=models.CharField(
                blank=True,
                help_text='Stripe payment status (succeeded, pending, failed)',
                max_length=50,
                null=True
            ),
        ),
    ]

