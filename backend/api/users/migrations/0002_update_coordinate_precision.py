# Generated manually to fix coordinate precision issues

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pharmacy',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=8, help_text='GPS latitude coordinate.', max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name='pharmacy',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=8, help_text='GPS longitude coordinate.', max_digits=13, null=True),
        ),
    ]
