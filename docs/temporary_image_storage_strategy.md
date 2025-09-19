# Temporary Image Storage Strategy for Prescription Orders

## Overview

This document outlines the strategy for temporarily storing prescription images before final order placement, optimizing database usage and avoiding unnecessary AWS uploads.

## Problem Statement

- Customer uploads prescription image
- Customer might change mind before placing order
- We don't want to upload to AWS until order is confirmed
- Need temporary storage solution

## Solution: Hybrid Temporary Storage

### Phase 1: Mobile App Temporary Storage
```typescript
// Store image locally in mobile app
interface PrescriptionUploadState {
  // Image storage
  imageUri: string | null;           // Local file URI
  
  // Prescription metadata
  doctorName: string;
  prescriptionDate: string;
  notes: string;
  
  // Upload status
  isUploaded: boolean;
  uploadTimestamp: number;
  
  // Session management
  sessionId: string;                 // Unique session identifier
}
```

### Phase 2: Temporary Backend Storage (Optional)
```python
# Only if we need backend validation before order
class TemporaryPrescription(models.Model):
    session_id = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    
    # Image data (temporary)
    image_data = models.TextField()  # Base64 encoded
    image_size = models.PositiveIntegerField()
    
    # Prescription metadata
    doctor_name = models.CharField(max_length=255)
    prescription_date = models.DateField()
    notes = models.TextField(blank=True)
    
    # Session management
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'temporary_prescription'
        indexes = [
            models.Index(fields=['session_id'], name='idx_temp_prescription_session'),
            models.Index(fields=['expires_at'], name='idx_temp_prescription_expires'),
        ]
    
    def clean_expired(self):
        """Clean up expired temporary prescriptions."""
        from django.utils import timezone
        self.objects.filter(expires_at__lt=timezone.now()).delete()
```

## Implementation Strategy

### 1. Mobile App Flow
```typescript
// Step 1: Upload prescription image
const uploadPrescriptionImage = async (imageUri: string) => {
  // Store locally in AsyncStorage
  const prescriptionData = {
    imageUri,
    doctorName: '',
    prescriptionDate: '',
    notes: '',
    isUploaded: false,
    uploadTimestamp: Date.now(),
    sessionId: generateSessionId(),
  };
  
  // Store in AsyncStorage
  await AsyncStorage.setItem('tempPrescription', JSON.stringify(prescriptionData));
  
  return prescriptionData;
};

// Step 2: Navigate to pharmacy selection
const navigateToPharmacySelection = () => {
  // Image stays in local storage
  router.push('/pharmacy-selection');
};

// Step 3: Complete order flow
const completeOrderFlow = async () => {
  // Get temporary data
  const tempData = await AsyncStorage.getItem('tempPrescription');
  const prescriptionData = JSON.parse(tempData);
  
  // Convert image to base64 and upload to AWS only when order is confirmed
  const imageData = await convertImageToBase64(prescriptionData.imageUri);
  const awsUrl = await uploadToAWS(imageData);
  
  // Create order with prescription
  const order = await createOrder({
    ...orderData,
    prescription_image_url: awsUrl,
    prescription_status: 'pending',
  });
  
  // Clean up temporary data
  await AsyncStorage.removeItem('tempPrescription');
};
```

### 2. Backend API Endpoints
```python
# Optional: Temporary prescription endpoint
@api_view(['POST'])
def create_temporary_prescription(request):
    """Create temporary prescription for session."""
    data = request.data
    
    # Create temporary prescription
    temp_prescription = TemporaryPrescription.objects.create(
        session_id=data['session_id'],
        image_data=data['image_data'],
        image_size=data['image_size'],
        doctor_name=data['doctor_name'],
        prescription_date=data['prescription_date'],
        notes=data['notes'],
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    return Response({
        'success': True,
        'session_id': temp_prescription.session_id,
        'expires_at': temp_prescription.expires_at
    })

@api_view(['POST'])
def create_order_with_prescription(request):
    """Create order and upload prescription to AWS."""
    data = request.data
    
    # Get temporary prescription
    temp_prescription = TemporaryPrescription.objects.get(
        session_id=data['session_id']
    )
    
    # Upload to AWS
    aws_url = upload_to_aws(temp_prescription.image_data)
    
    # Create order
    order = Order.objects.create(
        customer=data['customer'],
        delivery_address=data['delivery_address'],
        prescription_image_url=aws_url,
        prescription_status='pending',
        prescription_notes=temp_prescription.notes,
        # ... other order fields
    )
    
    # Mark temporary prescription as used
    temp_prescription.is_used = True
    temp_prescription.save()
    
    return Response({
        'success': True,
        'order_id': order.id,
        'order_number': order.order_number
    })
```

## Storage Options Comparison

### Option 1: Mobile-Only Storage (Recommended)
**Pros:**
- ✅ No backend storage needed
- ✅ Faster performance
- ✅ No cleanup required
- ✅ Works offline

**Cons:**
- ❌ Limited by device storage
- ❌ Data lost if app crashes
- ❌ No backend validation

### Option 2: Temporary Backend Storage
**Pros:**
- ✅ Backend validation possible
- ✅ Cross-device access
- ✅ Automatic cleanup
- ✅ Better error handling

**Cons:**
- ❌ Additional database storage
- ❌ Cleanup job required
- ❌ Network dependency

### Option 3: Hybrid Approach (Best)
**Pros:**
- ✅ Fast local storage
- ✅ Optional backend validation
- ✅ Fallback mechanisms
- ✅ Optimized performance

**Cons:**
- ❌ More complex implementation

## Recommended Implementation

### Phase 1: Mobile-Only Storage
```typescript
// Simple, fast implementation
const usePrescriptionUpload = () => {
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionUploadState | null>(null);
  
  const uploadImage = async (imageUri: string) => {
    const imageData = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const data = {
      imageUri,
      imageData,
      imageSize: await getImageSize(imageUri),
      doctorName: '',
      prescriptionDate: '',
      notes: '',
      isUploaded: false,
      uploadTimestamp: Date.now(),
      sessionId: generateSessionId(),
    };
    
    setPrescriptionData(data);
    await AsyncStorage.setItem('tempPrescription', JSON.stringify(data));
  };
  
  const clearData = async () => {
    setPrescriptionData(null);
    await AsyncStorage.removeItem('tempPrescription');
  };
  
  return { prescriptionData, uploadImage, clearData };
};
```

### Phase 2: Order Creation
```typescript
const createOrderWithPrescription = async (orderData: any) => {
  // Get temporary prescription data
  const tempData = await AsyncStorage.getItem('tempPrescription');
  if (!tempData) throw new Error('No prescription data found');
  
  const prescriptionData = JSON.parse(tempData);
  
  // Upload to AWS
  const awsUrl = await uploadToAWS(prescriptionData.imageData);
  
  // Create order
  const order = await apiService.createOrder({
    ...orderData,
    prescription_image_url: awsUrl,
    prescription_status: 'pending',
    prescription_notes: prescriptionData.notes,
  });
  
  // Clean up
  await AsyncStorage.removeItem('tempPrescription');
  
  return order;
};
```

## Cleanup Strategy

### Automatic Cleanup
```typescript
// Clean up expired data on app start
const cleanupExpiredData = async () => {
  const tempData = await AsyncStorage.getItem('tempPrescription');
  if (tempData) {
    const data = JSON.parse(tempData);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now - data.uploadTimestamp > maxAge) {
      await AsyncStorage.removeItem('tempPrescription');
    }
  }
};
```

### Manual Cleanup
```typescript
// Clean up when user cancels or completes order
const cleanupPrescriptionData = async () => {
  await AsyncStorage.removeItem('tempPrescription');
};
```

## Security Considerations

1. **Data Encryption**: Encrypt base64 data in AsyncStorage
2. **Session Management**: Use secure session IDs
3. **Data Validation**: Validate image data before storage
4. **Size Limits**: Limit image size to prevent storage issues

## Performance Optimization

1. **Image Compression**: Compress images before storage
2. **Lazy Loading**: Load image data only when needed
3. **Memory Management**: Clear data after use
4. **Background Cleanup**: Clean up expired data in background

## Conclusion

The recommended approach is **Mobile-Only Storage** for Phase 1, with optional backend storage for Phase 2. This provides:

- ✅ **Fast Performance**: No network calls until final order
- ✅ **Optimized Storage**: No unnecessary AWS uploads
- ✅ **User Experience**: Smooth flow without delays
- ✅ **Cost Effective**: Minimal backend storage usage

The implementation should start with mobile-only storage and can be enhanced with backend storage if needed for validation or cross-device access.
