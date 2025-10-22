# Senior Citizen Discount Implementation Plan

## 📋 Backend Review Summary

### ✅ **Already Implemented in Backend:**

#### 1. **Customer Model** (`backend/api/users/models.py`)
```python
# Senior Citizen Fields (Lines 554-578)
is_senior_citizen = models.BooleanField(default=False)
senior_citizen_id_number = models.CharField(max_length=100, blank=True, null=True)
senior_citizen_id_issued_by = models.CharField(max_length=100, blank=True, null=True)
senior_citizen_id_issue_date = models.DateField(blank=True, null=True)
is_identity_verified = models.BooleanField(default=False)

# Verification Tracking
primary_id_uploaded = models.BooleanField(default=False)
secondary_ids_uploaded = models.PositiveIntegerField(default=0)
```

#### 2. **Senior Discount Methods** (Lines 678-686)
```python
@property
def is_eligible_for_senior_discount(self):
    """Check if customer is eligible for senior citizen discount."""
    return self.is_senior_citizen and self.is_identity_verified

def get_senior_discount_percentage(self):
    """Return senior citizen discount percentage (20% under RA 9994)."""
    if self.is_eligible_for_senior_discount:
        return 20
    return 0
```

#### 3. **ValidID Types** (Line 309)
```python
class IDType(models.TextChoices):
    # ...
    SENIOR_CITIZEN_ID = 'senior_citizen_id', _('Senior Citizen ID')
    # ...
```

#### 4. **UserDocument Model** (Line 373+)
- Handles file uploads (Cloudinary integration)
- Links documents to ValidID types
- Tracks document status (pending, approved, rejected, expired)

#### 5. **Order Model Discount Support** (`backend/api/orders/models.py`)
```python
# Line 111-116
discount_amount = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0.00,
    validators=[MinValueValidator(0)],
    help_text=_('Total discount amount')
)

# Line 395-401
def apply_discount(self, discount_amount):
    """Apply discount to the order."""
    if discount_amount > self.subtotal:
        raise ValidationError(_('Discount cannot exceed subtotal'))
    
    self.discount_amount = discount_amount
    self.calculate_totals()

# Line 363
total = subtotal + tax_amount + self.delivery_fee - discount_amount
```

---

## 🎯 Implementation Plan

### **Phase 1: Customer Profile Enhancement (Frontend)**

#### 1.1 Create Senior Citizen Profile Page
**File:** `mobileapp/apps/customer-app/app/profile/senior-citizen.tsx`

**Features:**
- Toggle to indicate "I am a Senior Citizen"
- Upload Senior Citizen ID (image)
- Input fields:
  - Senior Citizen ID Number
  - Issued By (e.g., OSCA office)
  - Issue Date (date picker)
- Submit button
- Status indicator (pending/approved/rejected)

#### 1.2 Update User Profile API Service
**File:** `mobileapp/apps/customer-app/services/api.ts`

**New Methods:**
```typescript
async uploadSeniorCitizenID(customerId: number, data: {
  senior_citizen_id_number: string;
  issued_by: string;
  issue_date: string;
  file_url: string; // Cloudinary URL
}): Promise<ApiResponse<any>>

async checkSeniorDiscountEligibility(customerId: number): Promise<ApiResponse<{
  is_eligible: boolean;
  discount_percentage: number;
  verification_status: string;
}>>
```

---

### **Phase 2: Backend API Endpoints**

#### 2.1 Create Senior Citizen Verification Endpoint
**File:** `backend/api/users/senior_citizen_views.py` (NEW)

**Endpoints:**
```python
@csrf_exempt
def upload_senior_citizen_id(request):
    """
    Upload senior citizen ID document
    
    Expected JSON:
    {
        customer_id: int,
        senior_citizen_id_number: str,
        issued_by: str,
        issue_date: str (YYYY-MM-DD),
        file_url: str (Cloudinary URL)
    }
    
    Returns:
    {
        success: bool,
        message: str,
        document_id: int,
        status: str (pending/approved/rejected)
    }
    """
    # 1. Validate customer exists
    # 2. Create UserDocument with id_type='senior_citizen_id'
    # 3. Update Customer model fields
    # 4. Set is_senior_citizen=True
    # 5. Set verification status to 'pending'
    # 6. Return response

@csrf_exempt
def check_senior_discount_eligibility(request, customer_id):
    """
    Check if customer is eligible for senior discount
    
    Returns:
    {
        success: bool,
        is_eligible: bool,
        discount_percentage: int (0-20),
        is_senior_citizen: bool,
        is_identity_verified: bool,
        verification_status: str
    }
    """
    # Use customer.is_eligible_for_senior_discount
    # Use customer.get_senior_discount_percentage()

@csrf_exempt
def verify_senior_citizen_document(request, document_id):
    """
    Admin endpoint to approve/reject senior citizen ID
    
    Expected JSON:
    {
        action: 'approve' | 'reject',
        notes: str (optional)
    }
    """
    # 1. Find UserDocument
    # 2. Update status
    # 3. If approved: set customer.is_identity_verified=True
    # 4. Send notification to customer
```

#### 2.2 Update URL Configuration
**File:** `backend/api/direct/urls.py`

```python
path('upload-senior-citizen-id/', views.upload_senior_citizen_id),
path('check-senior-discount-eligibility/<int:customer_id>/', views.check_senior_discount_eligibility),
path('verify-senior-citizen-document/<int:document_id>/', views.verify_senior_citizen_document),
```

---

### **Phase 3: Order Page Integration**

#### 3.1 Update `order.tsx` UI
**File:** `mobileapp/apps/customer-app/app/order.tsx`

**New UI Elements (in Order Summary section):**

```typescript
// After subtotal, before delivery fee
{customer?.is_eligible_for_senior_discount && (
  <View style={styles.discountRow}>
    <Text style={styles.discountLabel}>Senior Citizen Discount (20%)</Text>
    <Text style={styles.discountAmount}>
      -₱{(calculateSubtotal() * 0.20).toFixed(2)}
    </Text>
  </View>
)}

// Add verification prompt if not verified but uploaded
{customer?.is_senior_citizen && !customer?.is_identity_verified && (
  <View style={styles.verificationAlert}>
    <Text style={styles.alertText}>
      🕐 Senior Citizen ID verification pending
    </Text>
  </View>
)}

// Add upload prompt if eligible by age but not uploaded
{customer?.age >= 60 && !customer?.is_senior_citizen && (
  <TouchableOpacity 
    style={styles.uploadPrompt}
    onPress={() => router.push('/profile/senior-citizen')}
  >
    <Text style={styles.promptText}>
      📄 Upload Senior Citizen ID to get 20% discount
    </Text>
  </TouchableOpacity>
)}
```

#### 3.2 Fetch Customer Discount Eligibility
```typescript
const [discountEligibility, setDiscountEligibility] = useState<any>(null);

useEffect(() => {
  const fetchDiscountEligibility = async () => {
    const response = await apiService.checkSeniorDiscountEligibility(customer.id);
    if (response.success) {
      setDiscountEligibility(response.data);
    }
  };
  
  if (customer?.id) {
    fetchDiscountEligibility();
  }
}, [customer]);
```

#### 3.3 Update Total Calculation
```typescript
const calculateTotal = () => {
  const subtotal = calculateSubtotal();
  const deliveryFee = deliveryInfo?.delivery_fee || 0;
  
  // Apply senior discount if eligible
  let discount = 0;
  if (discountEligibility?.is_eligible) {
    discount = subtotal * (discountEligibility.discount_percentage / 100);
  }
  
  return subtotal + deliveryFee - discount;
};
```

---

### **Phase 4: Order Creation with Discount**

#### 4.1 Update Order Creation API
**File:** `backend/api/orders/views.py` or `backend/api/direct/views_ops.py`

**In Create Order Function:**
```python
def create_order(request):
    # ... existing code ...
    
    # Check senior discount eligibility
    customer = Customer.objects.get(id=customer_id)
    discount_amount = Decimal('0.00')
    
    if customer.is_eligible_for_senior_discount:
        discount_percentage = customer.get_senior_discount_percentage()
        discount_amount = (subtotal * Decimal(discount_percentage)) / Decimal('100')
    
    # Create order
    order = Order.objects.create(
        # ... existing fields ...
        discount_amount=discount_amount,
    )
    
    # Calculate totals (includes discount)
    order.calculate_totals()
    order.save()
```

---

### **Phase 5: Admin Verification Interface**

#### 5.1 Django Admin Enhancement
**File:** `backend/api/users/admin.py`

**Custom Admin Actions:**
```python
@admin.action(description='Approve Senior Citizen ID')
def approve_senior_citizen_id(modeladmin, request, queryset):
    for doc in queryset:
        doc.status = 'approved'
        doc.save()
        # Update customer.is_identity_verified = True

@admin.action(description='Reject Senior Citizen ID')
def reject_senior_citizen_id(modeladmin, request, queryset):
    for doc in queryset:
        doc.status = 'rejected'
        doc.save()
```

---

## 📝 Implementation Checklist

### Backend:
- [ ] Create `senior_citizen_views.py` with 3 endpoints
- [ ] Add URL routes to `direct/urls.py`
- [ ] Test endpoints with Python test script
- [ ] Add admin actions for verification

### Frontend:
- [ ] Create `profile/senior-citizen.tsx` page
- [ ] Add Cloudinary upload for Senior Citizen ID
- [ ] Add API methods to `api.ts`
- [ ] Update `order.tsx` with discount display
- [ ] Update total calculation logic
- [ ] Add visual indicators for verification status

### Testing:
- [ ] Test file upload to Cloudinary
- [ ] Test discount calculation (20%)
- [ ] Test order creation with discount
- [ ] Test admin approval workflow
- [ ] Test edge cases (expired ID, age < 60, etc.)

---

## 🎨 UI/UX Considerations

### In Order Page (`order.tsx`):
```
┌─────────────────────────────────────┐
│ Order Summary                       │
├─────────────────────────────────────┤
│ Subtotal          ₱150.00          │
│ Senior Discount   -₱30.00 (20%)   │ ← NEW
│ Delivery Fee      ₱29.00           │
├─────────────────────────────────────┤
│ TOTAL             ₱149.00          │
└─────────────────────────────────────┘
```

### Verification States:
1. **Not Uploaded:** Show prompt "Upload Senior ID to save 20%"
2. **Pending:** Show "Verification pending (1-2 business days)"
3. **Approved:** Show discount automatically applied
4. **Rejected:** Show "ID verification failed. Please re-upload"

---

## 🔐 Security & Compliance

### Philippine Senior Citizen Act (RA 9994):
- 20% discount on medicines (compliant ✅)
- Age requirement: 60+ years old (enforced in backend ✅)
- Valid government-issued Senior Citizen ID required (enforced ✅)

### Data Privacy:
- Senior Citizen ID stored securely in Cloudinary
- Access restricted to admin for verification
- Customer can view their own verification status only

---

## 📊 Database Schema (Already Exists)

**No migrations needed!** All required fields already exist:

### `customers` table:
- `is_senior_citizen` ✅
- `senior_citizen_id_number` ✅
- `senior_citizen_id_issued_by` ✅
- `senior_citizen_id_issue_date` ✅
- `is_identity_verified` ✅

### `user_documents` table:
- `user_id` ✅
- `id_type_id` ✅ (links to ValidID)
- `file_url` ✅ (Cloudinary URL)
- `status` ✅ (pending/approved/rejected)

### `orders` table:
- `discount_amount` ✅

---

## 🚀 Next Steps

1. **Start with Backend API endpoints** (Phase 2)
2. **Test endpoints** with Python script
3. **Build Senior Citizen profile page** (Phase 1)
4. **Integrate into order page** (Phase 3)
5. **Test end-to-end flow**

---

**Estimated Development Time:** 4-6 hours
**Priority:** Medium-High (nice-to-have feature for customer acquisition)

