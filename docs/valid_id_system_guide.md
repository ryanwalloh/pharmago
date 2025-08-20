# Valid ID System Implementation Guide

## Overview

The Valid ID system in Pharmago implements the Philippine government's requirements for identity verification. This system categorizes valid IDs into **Primary** and **Secondary** categories, with strict verification requirements for different user types.

## ID Categories

### 🟢 Primary Valid IDs (9 types)
These are the most trusted and widely accepted forms of identification:

1. **PhilSys ID (PhilID/ePhilID)** - National ID issued by PSA
2. **Passport** - Issued by DFA
3. **Driver's License** - Issued by LTO
4. **UMID** - Unified Multi-Purpose ID (SSS, GSIS, PhilHealth, Pag-IBIG)
5. **PRC ID** - Professional Regulation Commission ID
6. **Postal ID** - Issued by Philippine Postal Corporation
7. **Voter's ID** - Issued by COMELEC
8. **SSS ID** - Social Security System ID
9. **PhilHealth ID** - Philippine Health Insurance Corporation ID

### 🟡 Secondary Valid IDs (11 types)
These are supplementary forms of identification:

1. **GSIS ID** - Government Service Insurance System ID
2. **Senior Citizen ID** - Issued by local government units
3. **NBI Clearance** - National Bureau of Investigation clearance
4. **Police Clearance** - Local police station clearance
5. **School ID** - Educational institution ID
6. **Barangay ID/Certification** - Local barangay ID
7. **TIN ID** - Tax Identification Number ID
8. **PWD ID** - Person with Disability ID
9. **OWWA ID** - Overseas Workers Welfare Administration ID
10. **Seafarer's Book/ID** - MARINA-issued ID
11. **Company ID** - Private company ID

## Verification Requirements by User Type

### 👤 Customer Verification
- **Option 1**: Upload **1 Primary Valid ID**
- **Option 2**: Upload **2 Secondary Valid IDs** (if no primary ID available)
- **Senior Citizen Bonus**: Additional 20% discount under RA 9994 (60+ years old)

### 🏥 Pharmacy Verification
- **Owner Identity**: Upload **1 Primary Valid ID**
- **Business Documents**: Business permit + Pharmacy license
- **Storefront**: Storefront image for verification
- **All documents must be current and not expired**

### 🚗 Rider Verification
- **Identity**: Upload **1 Primary Valid ID**
- **Birth Certificate**: PSA birth certificate (required for all riders)
- **Driver's License**: Required for motorized vehicles (motorcycle, car, scooter)
- **Age Requirement**: Must be 18+ years old
- **Vehicle Info**: Plate number required for motorcycles

## Implementation Details

### Database Models

#### ValidID Model
```python
class ValidID(models.Model):
    name = models.CharField(choices=IDType.choices)
    category = models.CharField(choices=IDCategory.choices)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
```

#### UserDocument Model
```python
class UserDocument(models.Model):
    user = models.ForeignKey(User)
    id_type = models.ForeignKey(ValidID)
    document_file = models.FileField()
    status = models.CharField(choices=DocumentStatus.choices)
    verified_by = models.ForeignKey(User)  # Admin who verified
```

### Admin Interface

The system provides a comprehensive Django admin interface for:
- **Valid ID Management**: Add/edit/disable ID types
- **Document Verification**: Review and approve/reject uploaded documents
- **User Management**: Manage customers, pharmacies, and riders
- **Verification Tracking**: Monitor verification status across all users

### Management Commands

#### Populate Valid IDs
```bash
python manage.py populate_valid_ids
```

This command automatically creates all 20 valid ID types in the database with proper categorization and descriptions.

## Usage Examples

### Creating a New Valid ID Type
```python
from api.users.models import ValidID

# Create a new primary ID
new_id = ValidID.objects.create(
    name='new_government_id',
    category='primary',
    description='New government-issued ID'
)
```

### Checking User Verification Status
```python
# Check if customer meets verification requirements
customer = Customer.objects.get(id=1)
if customer.meets_verification_requirements():
    print("Customer can be verified!")
else:
    print("Customer needs more documents")

# Check senior citizen discount eligibility
if customer.is_eligible_for_senior_discount:
    discount = customer.get_senior_discount_percentage()  # Returns 20
```

### Document Verification Workflow
```python
from api.users.models import UserDocument

# Admin verifies a document
document = UserDocument.objects.get(id=1)
document.status = 'approved'
document.verified_by = admin_user
document.verified_at = timezone.now()
document.save()

# Check if user is fully verified
if document.user.is_verified():
    print("User is fully verified!")
```

## Security Features

### Document Validation
- **File Type Validation**: Only accepted file formats
- **Size Limits**: Maximum file size restrictions
- **Expiry Tracking**: Automatic status updates for expired documents
- **Admin Review**: All documents require admin approval

### User Security
- **Account Locking**: Automatic lockout after 5 failed login attempts
- **Password Strength**: Enhanced requirements for pharmacy/rider accounts
- **Verification Tracking**: Complete audit trail of all verifications
- **Status Management**: Multiple user statuses (pending, active, suspended, banned)

## Compliance Features

### RA 9994 (Senior Citizens Act)
- **Automatic Detection**: Age calculation (60+ years)
- **Discount Calculation**: 20% discount on medicines
- **ID Verification**: Senior citizen ID validation
- **Audit Trail**: Complete verification history

### Business Verification
- **Document Expiry Tracking**: Automatic alerts for expired permits
- **Multi-step Verification**: Owner identity + business documents
- **Location Validation**: GPS coordinates and address verification
- **Operating Hours**: JSON-based business hours management

## Future Enhancements

### Planned Features
- **OCR Integration**: Automatic text extraction from ID images
- **Blockchain Verification**: Immutable verification records
- **API Integration**: Third-party verification services
- **Real-time Updates**: Live verification status updates
- **Mobile App Support**: Document upload via mobile devices

### Scalability
- **Multi-language Support**: Tagalog and English descriptions
- **Regional Variations**: Different ID types by region
- **Custom ID Types**: Pharmacy-specific document requirements
- **Bulk Verification**: Batch processing for multiple users

## Troubleshooting

### Common Issues

#### Document Upload Failures
- Check file format and size
- Verify user has proper permissions
- Ensure document type is active in system

#### Verification Delays
- Check admin approval queue
- Verify all required documents are uploaded
- Ensure document quality meets standards

#### Senior Citizen Status Issues
- Verify date of birth accuracy
- Check if senior citizen ID is uploaded
- Ensure identity verification is complete

### Support Commands
```bash
# Check verification status
python manage.py shell
>>> from api.users.models import User
>>> user = User.objects.get(email='user@example.com')
>>> print(f"Verified: {user.is_verified()}")
>>> print(f"Can Login: {user.can_login()}")

# Reset failed login attempts
>>> user.reset_failed_login_attempts()

# Check document status
>>> from api.users.models import UserDocument
>>> docs = UserDocument.objects.filter(user=user)
>>> for doc in docs:
...     print(f"{doc.id_type.name}: {doc.status}")
```

## Conclusion

The Valid ID system provides a robust, secure, and compliant foundation for user verification in Pharmago. It ensures that all users meet the necessary identity requirements while maintaining flexibility for different verification scenarios.

For technical support or questions about implementation, refer to the Django admin interface or use the provided management commands.
