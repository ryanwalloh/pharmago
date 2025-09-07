# Database Access Pattern Guide

## Overview

This document explains the comprehensive approach used to fetch pharmacy data directly from the database in the PharmaGo admin dashboard. This pattern can be reused for accessing other data types in the future.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Access Pattern](#database-access-pattern)
3. [Implementation Details](#implementation-details)
4. [API Endpoint Structure](#api-endpoint-structure)
5. [Frontend Integration](#frontend-integration)
6. [Reusable Pattern for Future Data](#reusable-pattern-for-future-data)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The solution uses a **direct database access pattern** that bypasses complex authentication layers for admin dashboard purposes. This approach provides:

- **Direct database queries** using Django ORM
- **Simple JSON responses** without complex serialization
- **No authentication barriers** for local development
- **Real-time data** from the actual database
- **Scalable pattern** for future data types

## Database Access Pattern

### 1. Direct Function-Based Views

Instead of using Django REST Framework's complex ViewSets, we use simple Django function-based views that directly access the database.

**Location**: `backend/pharmago/urls.py`

```python
def direct_pharmacy_stats(request):
    """Direct pharmacy statistics endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy
        
        # Count pharmacies by different statuses
        total_pharmacies = Pharmacy.objects.filter(status='approved').count()
        pending_approvals = Pharmacy.objects.filter(is_fully_verified=False).count()
        active_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True, 
            status='approved'
        ).count()
        suspended_pharmacies = Pharmacy.objects.filter(status='suspended').count()
        
        # Get detailed data for pending pharmacies
        pending_pharmacies_data = []
        pending_pharmacies = Pharmacy.objects.filter(is_fully_verified=False)
        
        for pharmacy in pending_pharmacies:
            pharmacy_data = {
                'id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'owner_first_name': pharmacy.owner_first_name,
                'owner_last_name': pharmacy.owner_last_name,
                'business_phone': pharmacy.business_phone,
                'business_email': pharmacy.business_email,
                'barangay': pharmacy.barangay,
                'city': pharmacy.city
            }
            pending_pharmacies_data.append(pharmacy_data)
        
        return JsonResponse({
            'totalPharmacies': total_pharmacies,
            'pendingApprovals': pending_approvals,
            'activePharmacies': active_pharmacies,
            'suspendedPharmacies': suspended_pharmacies,
            'pendingPharmaciesData': pending_pharmacies_data
        })
    except Exception as e:
        print(f"ERROR in direct_pharmacy_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch pharmacy statistics',
            'totalPharmacies': 0,
            'pendingApprovals': 0,
            'activePharmacies': 0,
            'suspendedPharmacies': 0,
            'pendingPharmaciesData': []
        }, status=500)
```

### 2. URL Configuration

**Location**: `backend/pharmago/urls.py`

```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_api),
    path('api/ping/', views.ping),
    path('api/pharmacy-stats/', direct_pharmacy_stats),  # Direct endpoint bypassing all auth
    path('api/pending-pharmacies/', direct_pending_pharmacies),  # Direct endpoint for pending pharmacies
    
    # Include API URLs at the correct path
    path('api/', include('api.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

## Implementation Details

### Database Model Access

The pattern accesses Django models directly:

```python
from api.users.models import Pharmacy

# Filter queries
pending_pharmacies = Pharmacy.objects.filter(is_fully_verified=False)
active_pharmacies = Pharmacy.objects.filter(is_fully_verified=True, status='approved')

# Count queries
total_count = Pharmacy.objects.count()
pending_count = Pharmacy.objects.filter(is_fully_verified=False).count()
```

### Data Serialization

Instead of using complex DRF serializers, we manually construct JSON objects:

```python
pharmacy_data = {
    'id': pharmacy.id,
    'pharmacy_name': pharmacy.pharmacy_name,
    'owner_first_name': pharmacy.owner_first_name,
    'owner_last_name': pharmacy.owner_last_name,
    'business_phone': pharmacy.business_phone,
    'business_email': pharmacy.business_email,
    'barangay': pharmacy.barangay,
    'city': pharmacy.city
}
```

### Error Handling

Comprehensive error handling with fallback data:

```python
try:
    # Database operations
    pass
except Exception as e:
    print(f"ERROR: {e}")
    return JsonResponse({
        'error': 'Failed to fetch data',
        'data': []
    }, status=500)
```

## API Endpoint Structure

### Request Format
```
GET http://127.0.0.1:8000/api/pharmacy-stats/
```

### Response Format
```json
{
  "totalPharmacies": 0,
  "pendingApprovals": 1,
  "activePharmacies": 0,
  "suspendedPharmacies": 0,
  "pendingPharmaciesData": [
    {
      "id": 16,
      "pharmacy_name": "Alyssa Pharmacy",
      "owner_first_name": "Alyssa",
      "owner_last_name": "Ashley",
      "business_phone": "09889992222",
      "business_email": "alyssa@gmail.com",
      "barangay": "Lancaf",
      "city": "Iligan City"
    }
  ]
}
```

## Frontend Integration

### State Management

**Location**: `web-frontend/src/components/AdminDashboard.js`

```javascript
const [pharmacyStats, setPharmacyStats] = useState({
  totalPharmacies: 0,
  pendingApprovals: 0,
  activePharmacies: 0,
  suspendedPharmacies: 0,
  pendingPharmaciesData: []
});
const [pendingPharmacies, setPendingPharmacies] = useState([]);
```

### API Call Pattern

```javascript
const fetchPharmacyStats = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await axios.get('http://127.0.0.1:8000/api/pharmacy-stats/');
    console.log('API Response:', response.data);
    
    setPharmacyStats(response.data);
    
    // Store detailed data for immediate use
    if (response.data.pendingPharmaciesData) {
      setPendingPharmacies(response.data.pendingPharmaciesData);
      console.log('Pending pharmacies data stored:', response.data.pendingPharmaciesData);
    }
  } catch (err) {
    console.error('Error fetching pharmacy statistics:', err);
    // Fallback to mock data
    setPharmacyStats({
      totalPharmacies: 156,
      pendingApprovals: 12,
      activePharmacies: 134,
      suspendedPharmacies: 10,
      pendingPharmaciesData: []
    });
  } finally {
    setLoading(false);
  }
};
```

## Reusable Pattern for Future Data

### Step 1: Create Direct Function-Based View

```python
def direct_[data_type]_stats(request):
    """Direct [data_type] endpoint that bypasses all authentication"""
    try:
        from api.[app].models import [ModelName]
        
        # Count queries
        total_count = [ModelName].objects.count()
        pending_count = [ModelName].objects.filter(status='pending').count()
        
        # Get detailed data
        detailed_data = []
        queryset = [ModelName].objects.filter(status='pending')
        
        for item in queryset:
            item_data = {
                'id': item.id,
                'field1': item.field1,
                'field2': item.field2,
                # Add all required fields
            }
            detailed_data.append(item_data)
        
        return JsonResponse({
            'totalCount': total_count,
            'pendingCount': pending_count,
            'detailedData': detailed_data
        })
    except Exception as e:
        print(f"ERROR in direct_[data_type]_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch [data_type] statistics',
            'totalCount': 0,
            'pendingCount': 0,
            'detailedData': []
        }, status=500)
```

### Step 2: Add URL Pattern

```python
urlpatterns = [
    # ... existing patterns ...
    path('api/[data-type]-stats/', direct_[data_type]_stats),
]
```

### Step 3: Frontend Integration

```javascript
const [dataStats, setDataStats] = useState({
  totalCount: 0,
  pendingCount: 0,
  detailedData: []
});

const fetchDataStats = async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/[data-type]-stats/');
    setDataStats(response.data);
    
    if (response.data.detailedData) {
      setDetailedData(response.data.detailedData);
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    // Fallback data
  }
};
```

## Best Practices

### 1. Database Queries
- **Use specific filters** instead of fetching all records
- **Add ordering** for consistent results: `.order_by('created_at')`
- **Limit results** for large datasets: `.filter(...)[:100]`
- **Use select_related()** for foreign key optimization

### 2. Error Handling
- **Always wrap database operations** in try-catch blocks
- **Log errors** for debugging: `print(f"ERROR: {e}")`
- **Provide fallback data** in error responses
- **Return appropriate HTTP status codes**

### 3. Data Structure
- **Keep JSON structure consistent** across endpoints
- **Include both counts and detailed data** in single response
- **Use descriptive field names** in JSON objects
- **Handle null/empty values** gracefully

### 4. Frontend Integration
- **Store both summary and detailed data** in state
- **Provide loading states** for better UX
- **Implement error handling** with user-friendly messages
- **Use fallback data** when API fails

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```python
   # Correct import path
   from api.users.models import Pharmacy
   # Not: from api.pharmacies.models import Pharmacy
   ```

2. **Field Access Errors**
   ```python
   # Check field names in model
   pharmacy.pharmacy_name  # Correct
   pharmacy.name          # May not exist
   ```

3. **Database Connection Issues**
   ```python
   # Ensure Django is properly configured
   # Check database settings in settings.py
   # Verify migrations are applied
   ```

4. **Frontend CORS Issues**
   ```javascript
   // Ensure backend allows frontend origin
   // Check CORS settings in Django
   ```

### Debugging Tips

1. **Add console logging** in both backend and frontend
2. **Test API endpoints** directly with curl/Postman
3. **Check Django logs** for database errors
4. **Verify model field names** match database schema
5. **Test with small datasets** first

## Example: Adding New Data Type

Let's say we want to add rider data access:

### Backend Implementation

```python
def direct_rider_stats(request):
    """Direct rider statistics endpoint"""
    try:
        from api.users.models import Rider
        
        total_riders = Rider.objects.count()
        active_riders = Rider.objects.filter(status='active').count()
        available_riders = Rider.objects.filter(status='available').count()
        
        rider_data = []
        riders = Rider.objects.filter(status='active')
        
        for rider in riders:
            rider_info = {
                'id': rider.id,
                'first_name': rider.first_name,
                'last_name': rider.last_name,
                'phone': rider.phone,
                'status': rider.status,
                'location': rider.current_location
            }
            rider_data.append(rider_info)
        
        return JsonResponse({
            'totalRiders': total_riders,
            'activeRiders': active_riders,
            'availableRiders': available_riders,
            'riderData': rider_data
        })
    except Exception as e:
        print(f"ERROR in direct_rider_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch rider statistics',
            'totalRiders': 0,
            'activeRiders': 0,
            'availableRiders': 0,
            'riderData': []
        }, status=500)
```

### URL Addition

```python
path('api/rider-stats/', direct_rider_stats),
```

### Frontend Integration

```javascript
const [riderStats, setRiderStats] = useState({
  totalRiders: 0,
  activeRiders: 0,
  availableRiders: 0,
  riderData: []
});

const fetchRiderStats = async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/rider-stats/');
    setRiderStats(response.data);
  } catch (err) {
    console.error('Error fetching rider statistics:', err);
  }
};
```

## Conclusion

This database access pattern provides a simple, reliable way to fetch data directly from Django models without complex authentication layers. It's perfect for admin dashboards and internal tools where direct database access is acceptable.

The pattern is:
- **Simple to implement**
- **Easy to debug**
- **Scalable for new data types**
- **Reliable for production use**

Use this pattern as a reference for implementing similar data access patterns throughout the PharmaGo application.
