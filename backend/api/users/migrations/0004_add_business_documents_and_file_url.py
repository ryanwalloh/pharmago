# Generated manually to add business document types and file_url field

from django.db import migrations, models


def create_business_document_types(apps, schema_editor):
    """Create business document types for pharmacy registration"""
    ValidID = apps.get_model('users', 'ValidID')
    
    business_docs = [
        ('Pharmacy License', 'business'),
        ('Business Permit', 'business'), 
        ('Owner Primary ID', 'business'),
        ('Storefront Image', 'business'),
    ]
    
    for name, category in business_docs:
        ValidID.objects.get_or_create(
            name=name,
            defaults={'category': category}
        )


def reverse_create_business_document_types(apps, schema_editor):
    """Remove business document types"""
    ValidID = apps.get_model('users', 'ValidID')
    
    business_docs = [
        'Pharmacy License',
        'Business Permit', 
        'Owner Primary ID',
        'Storefront Image',
    ]
    
    ValidID.objects.filter(name__in=business_docs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_change_coordinates_to_float'),
    ]

    operations = [
        # Add file_url field to UserDocument model
        migrations.AddField(
            model_name='userdocument',
            name='file_url',
            field=models.URLField(
                blank=True, 
                null=True, 
                help_text='S3 URL of uploaded file'
            ),
        ),
        
        # Create business document types
        migrations.RunPython(
            create_business_document_types,
            reverse_create_business_document_types
        ),
    ]
