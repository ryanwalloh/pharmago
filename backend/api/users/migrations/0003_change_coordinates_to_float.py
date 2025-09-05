# Generated manually to change coordinates from DecimalField to FloatField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_update_coordinate_precision'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pharmacy',
            name='latitude',
            field=models.FloatField(blank=True, help_text='GPS latitude coordinate.', null=True),
        ),
        migrations.AlterField(
            model_name='pharmacy',
            name='longitude',
            field=models.FloatField(blank=True, help_text='GPS longitude coordinate.', null=True),
        ),
    ]
