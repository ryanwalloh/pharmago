# Pharmacy Registration Process Documentation

## Overview
This document outlines the complete pharmacy registration process for PharmaGo, including all required fields, validation rules, and implementation requirements. The registration process involves creating both a User account and a Pharmacy profile with comprehensive business information and document verification.

## Registration Flow Architecture

### Two-Phase Registration Process
1. **Phase 1**: User Account Creation (Base authentication)
2. **Phase 2**: Pharmacy Profile Creation (Business-specific information)

## Phase 1: User Account Registration

### Required Fields for User Model
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `username` | CharField | ✅ | Unique, 3-30 chars | Unique identifier |
| `email` | EmailField | ✅ | Unique, valid email | Primary contact |
| `password` | CharField | ✅ | Min 8 chars, complexity | Encrypted storage |
| `password_confirm` | CharField | ✅ | Must match password | Client-side validation |
| `first_name` | CharField | ✅ | 1-30 chars | Owner's first name |
| `last_name` | CharField | ✅ | 1-30 chars | Owner's last name |
| `middle_name` | CharField | ❌ | 1-30 chars | Optional middle name |
| `phone` | CharField | ✅ | Valid phone format | Business contact |
| `date_of_birth` | DateField | ✅ | Valid date, 18+ years | Age verification |
| `gender` | CharField | ✅ | Male/Female/Other | Demographic info |
| `role` | CharField | ✅ | Must be 'pharmacy' | User type |

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character
- Maximum 128 characters
- Cannot be common passwords
- No sequential characters (abc, 123)
- No excessive repeated characters

## Phase 2: Pharmacy Profile Registration

### Business Information
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `pharmacy_name` | CharField | ✅ | 1-255 chars | Official business name |
| `business_permit_number` | CharField | ✅ | Unique, 1-100 chars | Government permit |
| `business_permit_expiry` | DateField | ✅ | Future date | Permit validity |
| `pharmacy_license_number` | CharField | ✅ | Unique, 1-100 chars | Professional license |
| `pharmacy_license_expiry` | DateField | ✅ | Future date | License validity |

### Owner Information
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `owner_first_name` | CharField | ✅ | 1-100 chars | Must match user first_name |
| `owner_last_name` | CharField | ✅ | 1-100 chars | Must match user last_name |
| `owner_middle_name` | CharField | ❌ | 1-100 chars | Optional |
| `owner_date_of_birth` | DateField | ✅ | Valid date | Must match user date_of_birth |
| `owner_gender` | CharField | ✅ | Male/Female/Other | Must match user gender |

### Contact Information
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `business_phone` | CharField | ✅ | Valid phone format | Business line |
| `business_email` | EmailField | ✅ | Valid email | Business email |

### Location Information
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `street_address` | CharField | ✅ | 1-255 chars | Complete street address |
| `barangay` | CharField | ✅ | 1-100 chars | Barangay name |
| `city` | CharField | ✅ | 1-50 chars | Default: 'Iligan City' |
| `province` | CharField | ✅ | 1-50 chars | Default: 'Lanao del Norte' |
| `postal_code` | CharField | ❌ | 1-10 chars | Optional ZIP code |
| `latitude` | DecimalField | ❌ | -90 to 90 | GPS coordinate |
| `longitude` | DecimalField | ❌ | -180 to 180 | GPS coordinate |

### Business Operations
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `operating_hours` | JSONField | ✅ | 7-day structure | Weekly schedule |
| `services_offered` | JSONField | ✅ | Array of services | Business services |
| `payment_methods_accepted` | JSONField | ✅ | Array of methods | Payment options |

#### Operating Hours Structure
```json
{
  "monday": {
    "is_open": true,
    "open_time": "08:00",
    "close_time": "20:00"
  },
  "tuesday": {
    "is_open": true,
    "open_time": "08:00",
    "close_time": "20:00"
  },
  // ... for all 7 days
}
```

#### Services Offered Options
- `delivery` - Home delivery service
- `consultation` - Pharmacist consultation
- `prescription_filling` - Prescription medication
- `over_the_counter` - OTC medications
- `health_screening` - Basic health checks
- `vaccination` - Vaccination services

#### Payment Methods Options
- `cash` - Cash payments
- `credit_card` - Credit card payments
- `debit_card` - Debit card payments
- `online_banking` - Online banking
- `mobile_payment` - Mobile payment apps
- `insurance` - Insurance coverage

### Document Verification Requirements
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `owner_primary_id_uploaded` | BooleanField | ✅ | Must be true | Valid government ID |
| `business_permit_uploaded` | BooleanField | ✅ | Must be true | Business permit document |
| `pharmacy_license_uploaded` | BooleanField | ✅ | Must be true | Professional license |
| `storefront_image_uploaded` | BooleanField | ✅ | Must be true | Pharmacy exterior photo |

### Document Upload Requirements
| Document Type | File Format | Max Size | Required Fields |
|---------------|-------------|----------|-----------------|
| Owner Primary ID | PDF, JPG, PNG | 5MB | file_url, expiry_date |
| Business Permit | PDF, JPG, PNG | 5MB | file_url, expiry_date |
| Pharmacy License | PDF, JPG, PNG | 5MB | file_url, expiry_date |
| Storefront Image | JPG, PNG | 2MB | file_url |

## Registration Status Flow

### Pharmacy Status Options
1. **PENDING** - Initial status after registration
2. **APPROVED** - Admin approved, fully verified
3. **REJECTED** - Admin rejected, needs resubmission
4. **SUSPENDED** - Temporarily suspended
5. **CLOSED** - Permanently closed

### Verification Process
1. **Initial Registration** → Status: PENDING
2. **Document Review** → Admin reviews uploaded documents
3. **Verification Decision** → APPROVED or REJECTED
4. **Account Activation** → User account becomes verified

## API Endpoints

### User Registration
```
POST /api/users/register/
Content-Type: application/json

{
  "username": "pharmacy_owner",
  "email": "owner@pharmacy.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Michael",
  "phone": "+639123456789",
  "date_of_birth": "1985-06-15",
  "gender": "male",
  "role": "pharmacy"
}
```

### Pharmacy Profile Creation
```
POST /api/pharmacy-profiles/
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "user_id": 123,
  "pharmacy_name": "Health Plus Pharmacy",
  "business_permit_number": "BP-2024-001234",
  "pharmacy_license_number": "PL-2024-005678",
  "business_documents": {
    "business_license": {
      "file_url": "https://storage.example.com/docs/bp.pdf",
      "expiry_date": "2025-12-31"
    },
    "pharmacy_license": {
      "file_url": "https://storage.example.com/docs/pl.pdf",
      "expiry_date": "2025-12-31"
    },
    "tax_id": {
      "file_url": "https://storage.example.com/docs/tax.pdf",
      "expiry_date": "2025-12-31"
    }
  },
  "operating_hours": {
    "monday": {"is_open": true, "open_time": "08:00", "close_time": "20:00"},
    "tuesday": {"is_open": true, "open_time": "08:00", "close_time": "20:00"},
    "wednesday": {"is_open": true, "open_time": "08:00", "close_time": "20:00"},
    "thursday": {"is_open": true, "open_time": "08:00", "close_time": "20:00"},
    "friday": {"is_open": true, "open_time": "08:00", "close_time": "20:00"},
    "saturday": {"is_open": true, "open_time": "09:00", "close_time": "18:00"},
    "sunday": {"is_open": false, "open_time": "09:00", "close_time": "18:00"}
  },
  "delivery_radius_km": 10,
  "minimum_order_amount": 100.00,
  "delivery_fee": 50.00,
  "service_fee_percentage": 5.0
}
```

## Frontend Implementation Requirements

### Multi-Step Registration Form
1. **Step 1**: User Account Information
2. **Step 2**: Business Information
3. **Step 3**: Location Information
4. **Step 4**: Business Operations
5. **Step 5**: Document Uploads
6. **Step 6**: Review & Submit

### Form Validation Rules
- Real-time validation for each field
- Progressive validation (validate step before proceeding)
- Server-side validation feedback
- File upload validation (size, format, content)
- Duplicate checking for unique fields

### User Experience Features
- Progress indicator
- Save draft functionality
- Mobile-responsive design
- Accessibility compliance
- Error handling and user feedback
- Loading states during submission

## Security Considerations

### Data Protection
- All sensitive data encrypted in transit and at rest
- File uploads scanned for malware
- Personal information anonymized in logs
- GDPR compliance for data handling

### Authentication
- JWT token-based authentication
- Password strength requirements
- Account lockout after failed attempts
- Email/phone verification required

### Document Security
- Secure file storage with access controls
- Document integrity verification
- Expiry date tracking and notifications
- Admin-only access to verification documents

## Testing Requirements

### Unit Tests
- Field validation tests
- Serializer tests
- Model tests
- API endpoint tests

### Integration Tests
- Complete registration flow
- File upload functionality
- Email verification process
- Admin verification workflow

### User Acceptance Tests
- End-to-end registration process
- Mobile device compatibility
- Error handling scenarios
- Performance under load

## Monitoring and Analytics

### Key Metrics
- Registration completion rate
- Drop-off points in the process
- Document upload success rate
- Verification approval rate
- Time to complete registration

### Error Tracking
- Form validation errors
- API error responses
- File upload failures
- Network connectivity issues

## Future Enhancements

### Planned Features
- Social media login integration
- Automated document verification (OCR)
- Real-time address validation
- GPS location auto-detection
- Multi-language support
- Bulk registration for pharmacy chains

### Technical Improvements
- Progressive web app (PWA) support
- Offline form completion
- Advanced file compression
- Real-time collaboration for multi-user registration
- Integration with government databases for automatic verification

## Maintenance and Updates

### Regular Tasks
- Document expiry monitoring
- Security patch updates
- Performance optimization
- User feedback collection
- Compliance audits

### Version Control
- API versioning strategy
- Backward compatibility maintenance
- Database migration procedures
- Rollback procedures

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: March 2024  
**Maintained By**: PharmaGo Development Team
