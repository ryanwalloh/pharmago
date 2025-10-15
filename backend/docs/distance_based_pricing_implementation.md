# Distance-Based Delivery Fee Pricing Implementation

## 📋 Overview

This document describes the implementation of a fair, distance-based delivery fee pricing system that uses Google Maps Distance Matrix API to calculate accurate driving distances and adjust delivery fees accordingly.

## 🎯 Problem Statement

**Issue:** Fixed delivery fee (₱29.00) for all orders regardless of distance is unfair to riders.

**Example:**
- Short delivery (2km): Rider gets ₱23.20 for easy job ✅
- Long delivery (10km): Rider gets ₱23.20 for much harder job ❌

**Solution:** Dynamic pricing based on actual driving distance.

## 💰 Pricing Formula

### Configuration

```python
BASE_FEE = ₱29.00        # Base delivery fee (for distances up to 5km)
THRESHOLD_KM = 5.0       # Distance threshold before additional charges
RATE_PER_KM = ₱8.00      # Additional fee per km over threshold
```

### Formula

```python
if distance <= 5km:
    delivery_fee = ₱29.00
else:
    exceeds_by = distance - 5
    delivery_fee = ₱29.00 + (exceeds_by × ₱8.00)
```

### Examples

| Distance | Calculation | Delivery Fee | Rider Gets (80%) |
|----------|-------------|--------------|------------------|
| 2.0 km | Base fee only | **₱29.00** | ₱23.20 |
| 5.0 km | Base fee only | **₱29.00** | ₱23.20 |
| 7.5 km | ₱29 + (2.5 × ₱8) | **₱49.00** | ₱39.20 |
| 10.0 km | ₱29 + (5 × ₱8) | **₱69.00** | ₱55.20 |
| 12.3 km | ₱29 + (7.3 × ₱8) | **₱87.40** | ₱69.92 |

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Order Creation Flow                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Get pharmacy coordinates (latitude, longitude)          │
│     From: Pharmacy model                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Get customer delivery address coordinates               │
│     From: Address model (delivery_address)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Calculate Driving Distance                              │
│     Via: Google Maps Distance Matrix API                    │
│     Returns: distance_km, duration_minutes                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Apply Pricing Formula                                   │
│     Via: DeliveryPricingService                             │
│     Returns: calculated delivery_fee                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Create Order with Dynamic Fee                           │
│     Store: delivery_fee in Order model                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation Details

### 1. DeliveryPricingService (`backend/api/orders/pricing_service.py`)

**Purpose:** Central service for all delivery fee calculations.

**Key Methods:**

#### `calculate_delivery_fee()`
```python
from api.orders.pricing_service import DeliveryPricingService

fee, distance = DeliveryPricingService.calculate_delivery_fee(
    pharmacy_lat=8.2280,
    pharmacy_lng=124.2452,
    customer_lat=8.2500,
    customer_lng=124.2700,
    use_google_maps=True  # Uses Google Maps API
)

# Returns:
# - fee: Decimal (e.g., Decimal('49.00'))
# - distance: float (e.g., 7.5 km)
```

#### `get_pricing_breakdown()`
```python
breakdown = DeliveryPricingService.get_pricing_breakdown(distance_km=7.5)

# Returns:
# {
#   'distance_km': 7.5,
#   'base_fee': 29.00,
#   'threshold_km': 5.0,
#   'within_threshold': False,
#   'exceeds_by_km': 2.5,
#   'rate_per_km': 8.00,
#   'additional_fee': 20.00,
#   'total_fee': 49.00
# }
```

**Features:**
- ✅ Configurable pricing parameters
- ✅ Google Maps integration with Haversine fallback
- ✅ Detailed logging for debugging
- ✅ Error handling with safe defaults
- ✅ Pricing breakdown for transparency

### 2. Order Creation (`backend/api/orders/direct_endpoints.py`)

**Updated:** Prescription order creation now calculates delivery fee dynamically.

**Lines 153-183:**
```python
# Calculate dynamic delivery fee based on distance
from api.orders.pricing_service import DeliveryPricingService

delivery_fee = Decimal('29.00')  # Default fallback

# Calculate if coordinates are available
if (pharmacy.latitude and pharmacy.longitude and 
    delivery_address.latitude and delivery_address.longitude):
    
    calculated_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
        float(pharmacy.latitude),
        float(pharmacy.longitude),
        float(delivery_address.latitude),
        float(delivery_address.longitude),
        use_google_maps=True
    )
    delivery_fee = calculated_fee
    
    logger.info(
        f"💰 Dynamic pricing: {distance_km:.2f}km → ₱{delivery_fee:.2f}"
    )

# Create order with calculated fee
order = Order.objects.create(
    # ...
    delivery_fee=delivery_fee,  # Dynamic fee
    # ...
)
```

### 3. Order Model (`backend/api/orders/models.py`)

**Updated:** `calculate_totals()` method now uses dynamic pricing when recalculating.

**Lines 317-357:**
```python
# Only recalculate if delivery_fee is not set or is zero
if not existing_delivery or existing_delivery <= 0:
    # Get pharmacy from first order line
    first_line = self.order_lines.first()
    pharmacy = first_line.inventory_item.pharmacy
    
    # Calculate if both have coordinates
    if (pharmacy.latitude and self.delivery_address.latitude):
        calculated_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
            float(pharmacy.latitude),
            float(pharmacy.longitude),
            float(self.delivery_address.latitude),
            float(self.delivery_address.longitude),
            use_google_maps=True
        )
        self.delivery_fee = calculated_fee
```

## 📊 Pricing Examples

### Real-World Scenarios

**Scenario 1: Short Delivery (Within City)**
- **From:** PharmaCare Plus (Brgy. San Antonio)
- **To:** Customer (Brgy. San Isidro)
- **Distance:** 3.2 km
- **Calculation:** Within 5km threshold
- **Fee:** ₱29.00
- **Rider Gets:** ₱23.20 (80%)

**Scenario 2: Medium Delivery (Nearby Barangay)**
- **From:** MediCare Pharmacy (Brgy. Tibanga)
- **To:** Customer (Brgy. Pala-o)
- **Distance:** 6.8 km
- **Calculation:** ₱29 + (1.8 × ₱8) = ₱29 + ₱14.40
- **Fee:** ₱43.40
- **Rider Gets:** ₱34.72 (80%)

**Scenario 3: Long Delivery (Far Barangay)**
- **From:** PharmEasy (Brgy. Poblacion)
- **To:** Customer (Brgy. Ditucalan)
- **Distance:** 11.5 km
- **Calculation:** ₱29 + (6.5 × ₱8) = ₱29 + ₱52
- **Fee:** ₱81.00
- **Rider Gets:** ₱64.80 (80%)

**Scenario 4: Very Long Delivery (Remote Area)**
- **From:** HealthCare Pharmacy (Brgy. San Miguel)
- **To:** Customer (Brgy. Luinab)
- **Distance:** 15.0 km
- **Calculation:** ₱29 + (10 × ₱8) = ₱29 + ₱80
- **Fee:** ₱109.00
- **Rider Gets:** ₱87.20 (80%)

## 🎯 Benefits

### For Riders
- ✅ **Fair compensation** for long-distance deliveries
- ✅ **Motivation** to accept orders in remote areas
- ✅ **Higher earnings** potential (up to 3-4× for long distances)
- ✅ **Transparent** pricing based on actual distance

### For Platform
- ✅ **Rider satisfaction** and retention
- ✅ **Better coverage** of remote areas
- ✅ **Reduced delivery rejections**
- ✅ **Scalable** pricing model

### For Customers
- ✅ **Fair pricing** - pay for actual distance
- ✅ **Reliable delivery** to remote areas
- ✅ **Transparent** - distance-based calculation
- ✅ **Predictable** costs based on location

## 🔄 How It Works

### When Customer Creates Order

1. **Customer selects pharmacy** → Pharmacy coordinates loaded
2. **Customer enters delivery address** → Address coordinates saved
3. **System calculates distance:**
   ```
   Google Maps API: Pharmacy (8.2280, 124.2452) → Customer (8.2500, 124.2700)
   Result: 7.5 km driving distance
   ```
4. **System applies formula:**
   ```
   Base: ₱29.00
   Exceeds by: 7.5 - 5.0 = 2.5 km
   Additional: 2.5 × ₱8.00 = ₱20.00
   Total: ₱29.00 + ₱20.00 = ₱49.00
   ```
5. **Order created** with `delivery_fee = ₱49.00`

### When Order is Recalculated

If pharmacist updates items and triggers `order.calculate_totals()`:
- ✅ Preserves existing `delivery_fee` if already set
- ✅ Only recalculates if `delivery_fee` is 0 or not set
- ✅ Uses same distance-based formula

## 💻 Code Implementation

### Service Class Structure

```python
class DeliveryPricingService:
    # Pricing configuration (can be updated via admin panel)
    BASE_FEE = Decimal('29.00')
    THRESHOLD_KM = Decimal('5.0')
    RATE_PER_KM = Decimal('8.00')
    
    @classmethod
    def calculate_delivery_fee(cls, pharmacy_lat, pharmacy_lng, 
                                customer_lat, customer_lng, 
                                use_google_maps=True):
        """Main calculation method"""
        # 1. Get distance from Google Maps
        # 2. Apply pricing formula
        # 3. Return fee and distance
        
    @classmethod
    def _calculate_fee_from_distance(cls, distance_km):
        """Apply formula to distance"""
        # if distance <= THRESHOLD: return BASE_FEE
        # else: return BASE_FEE + ((distance - THRESHOLD) × RATE_PER_KM)
    
    @classmethod
    def get_pricing_breakdown(cls, distance_km):
        """Get detailed breakdown for display"""
        # Returns dictionary with all pricing components
    
    @classmethod
    def update_configuration(cls, base_fee=None, threshold_km=None, 
                            rate_per_km=None):
        """Update pricing config (for admin panel)"""
```

### Integration Points

**Order Creation:**
```python
# In direct_prescription_order_creation()
from api.orders.pricing_service import DeliveryPricingService

calculated_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
    float(pharmacy.latitude),
    float(pharmacy.longitude),
    float(delivery_address.latitude),
    float(delivery_address.longitude),
    use_google_maps=True
)

order = Order.objects.create(
    delivery_fee=calculated_fee,  # Dynamic fee
    # ... other fields
)
```

**Order Recalculation:**
```python
# In Order.calculate_totals()
if not existing_delivery or existing_delivery <= 0:
    # Calculate dynamic fee
    calculated_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(...)
    self.delivery_fee = calculated_fee
```

## 🧪 Testing

### Test Script

Run the existing test script to see pricing in action:
```bash
cd backend
python test_google_maps_batching.py
```

### Manual Testing

#### Test Case 1: Short Distance (Within Threshold)
1. Create order with pharmacy 3km from customer
2. **Expected:** delivery_fee = ₱29.00
3. **Check logs:** "💰 Dynamic pricing: 3.00km → ₱29.00"

#### Test Case 2: Medium Distance (Slightly Over)
1. Create order with pharmacy 6km from customer
2. **Expected:** delivery_fee = ₱29.00 + (1 × ₱8) = ₱37.00
3. **Check logs:** "💰 Dynamic pricing: 6.00km → ₱37.00"

#### Test Case 3: Long Distance (Far Over)
1. Create order with pharmacy 10km from customer
2. **Expected:** delivery_fee = ₱29.00 + (5 × ₱8) = ₱69.00
3. **Check logs:** "💰 Dynamic pricing: 10.00km → ₱69.00"

#### Test Case 4: Very Long Distance
1. Create order with pharmacy 15km from customer
2. **Expected:** delivery_fee = ₱29.00 + (10 × ₱8) = ₱109.00
3. **Check logs:** "💰 Dynamic pricing: 15.00km → ₱109.00"

### Database Verification

Check calculated fees in database:
```sql
SELECT 
    order_number,
    delivery_fee,
    delivery_address_id
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

## 📈 Rider Earnings Impact

### Earnings Comparison

**Before (Fixed Fee):**
| Distance | Delivery Fee | Rider Gets (80%) |
|----------|--------------|------------------|
| 2 km | ₱29.00 | ₱23.20 |
| 10 km | ₱29.00 | ₱23.20 |
| **Difference:** | **₱0** | **₱0** |

**After (Distance-Based):**
| Distance | Delivery Fee | Rider Gets (80%) |
|----------|--------------|------------------|
| 2 km | ₱29.00 | ₱23.20 |
| 10 km | ₱69.00 | ₱55.20 |
| **Difference:** | **+₱40** | **+₱32** |

**Rider benefit:** +138% earnings for long-distance deliveries! 🚀

## 🔄 Fallback Mechanisms

### If Google Maps API Fails

1. **Automatic Haversine Fallback:**
   ```python
   result = GoogleMapsService.get_driving_distance(
       ...,
       fallback_to_haversine=True  # Automatic fallback
   )
   ```

2. **If All Distance Calculations Fail:**
   ```python
   delivery_fee = Decimal('29.00')  # Safe default
   logger.warning("Using default delivery fee")
   ```

### If Coordinates Missing

```python
if not pharmacy.latitude or not delivery_address.latitude:
    delivery_fee = Decimal('29.00')  # Default
    logger.warning("Missing coordinates, using default fee")
```

## 🔒 Configuration Management

### Current Configuration (Hardcoded)

```python
BASE_FEE = Decimal('29.00')
THRESHOLD_KM = Decimal('5.0')
RATE_PER_KM = Decimal('8.00')
```

### Future: Admin Panel Configuration

```python
# Update pricing via admin panel
DeliveryPricingService.update_configuration(
    base_fee=Decimal('35.00'),      # Increase base fee
    threshold_km=Decimal('3.0'),    # Stricter threshold
    rate_per_km=Decimal('10.00')    # Higher per-km rate
)
```

**To implement:**
1. Create Django admin panel section
2. Add PricingConfiguration model
3. Load config from database instead of hardcoded
4. Allow real-time updates

## 📊 Business Impact

### Revenue Simulation

**Assumptions:**
- 100 orders per day
- Average distance: 6km
- 60% within 5km, 40% beyond

**Before (Fixed Fee):**
```
100 orders × ₱29 = ₱2,900/day
Platform gets 20% = ₱580/day
```

**After (Distance-Based):**
```
60 orders × ₱29 (within 5km) = ₱1,740
40 orders × ₱37 (avg 6km) = ₱1,480
Total = ₱3,220/day
Platform gets 20% = ₱644/day
```

**Impact:**
- +11% platform revenue
- +11% rider earnings
- Better rider satisfaction
- More reliable long-distance coverage

## 🎯 Rider Earnings Distribution

### Before vs. After

**Before (Fixed):**
- All deliveries: ₱23.20
- No incentive for long trips
- Riders avoid far orders

**After (Distance-Based):**
- Short (2-5km): ₱23.20
- Medium (6-8km): ₱31-43
- Long (9-12km): ₱51-75
- Very long (13-15km): ₱83-107

**Result:** Riders now incentivized to accept all orders!

## 🔐 Security & Reliability

### Error Handling

1. **API Timeout:** Falls back to Haversine
2. **Invalid Coordinates:** Uses default ₱29.00
3. **Missing Data:** Safe defaults prevent crashes
4. **Calculation Errors:** Logged and handled gracefully

### Logging

Every calculation logs:
```
INFO: 💰 Dynamic pricing: 7.50km → ₱49.00
INFO: 📍 Distance: 7.50km, Duration: 12.3 min
DEBUG: 📊 Distance 7.50km exceeds threshold by 2.50km → Additional ₱20.00 → Total ₱49.00
```

## 📝 API Impact

### Order Response Update

**Before:**
```json
{
  "order_id": 123,
  "delivery_fee": 29.00
}
```

**After (same structure, dynamic value):**
```json
{
  "order_id": 123,
  "delivery_fee": 49.00  // Calculated based on distance
}
```

**No breaking changes!** Existing API consumers work without modifications.

## 🚀 Deployment Notes

### Prerequisites

1. ✅ Google Maps API key configured in `.env`
2. ✅ Pharmacy coordinates in database
3. ✅ Customer address coordinates in database
4. ✅ `googlemaps` package installed

### Migration Path

**Phase 1: Soft Launch** ✅ (Current)
- Distance-based pricing enabled
- Applies to all new orders
- Existing orders keep their original fees

**Phase 2: Monitoring**
- Track average delivery fees
- Monitor rider acceptance rates
- Analyze customer feedback

**Phase 3: Optimization**
- Adjust THRESHOLD_KM based on data
- Tune RATE_PER_KM for market conditions
- Consider time-based multipliers (peak hours)

## 💡 Future Enhancements

### Planned Features

1. **Dynamic Thresholds by Zone:**
   ```python
   Urban Zone: 3km threshold, ₱10/km
   Suburban Zone: 5km threshold, ₱8/km
   Rural Zone: 7km threshold, ₱6/km
   ```

2. **Time-Based Multipliers:**
   ```python
   Peak Hours (5-7pm): 1.5× rate
   Late Night (10pm-6am): 2× rate
   Holidays: 1.8× rate
   ```

3. **Weather Adjustments:**
   ```python
   Heavy Rain: +₱10 base fee
   Typhoon: +₱20 base fee
   ```

4. **Rider Tier System:**
   ```python
   Gold Riders (high rating): 85% commission
   Silver Riders: 80% commission
   Bronze Riders: 75% commission
   ```

## 📚 Code Files

### New Files Created
- `backend/api/orders/pricing_service.py` - Pricing service (NEW)
- `backend/docs/distance_based_pricing_implementation.md` - This document (NEW)

### Modified Files
- `backend/api/orders/direct_endpoints.py` - Order creation with dynamic pricing
- `backend/api/orders/models.py` - Order recalculation with dynamic pricing
- `backend/requirements.txt` - Added `googlemaps==4.10.0`

### Related Files
- `backend/api/utils/google_maps_service.py` - Google Maps integration
- `backend/api/delivery/models.py` - Order batching service
- `backend/pharmago/settings.py` - Google Maps API key configuration

## 🧮 Formula Reference

### Quick Reference Card

```
┌─────────────────────────────────────────────┐
│     DELIVERY FEE PRICING FORMULA            │
├─────────────────────────────────────────────┤
│                                             │
│  BASE FEE:        ₱29.00                    │
│  THRESHOLD:       5.0 km                    │
│  RATE PER KM:     ₱8.00                     │
│                                             │
│  IF distance ≤ 5km:                         │
│      fee = ₱29.00                           │
│                                             │
│  IF distance > 5km:                         │
│      fee = ₱29 + ((distance - 5) × ₱8)     │
│                                             │
│  RIDER GETS: 80% of fee                     │
│  PLATFORM GETS: 20% of fee                  │
│                                             │
└─────────────────────────────────────────────┘
```

### Example Calculations Table

| Distance | Exceeds By | Additional Fee | Total Fee | Rider (80%) |
|----------|-----------|----------------|-----------|-------------|
| 0-5 km | 0 km | ₱0 | ₱29.00 | ₱23.20 |
| 6 km | 1 km | ₱8 | ₱37.00 | ₱29.60 |
| 7 km | 2 km | ₱16 | ₱45.00 | ₱36.00 |
| 8 km | 3 km | ₱24 | ₱53.00 | ₱42.40 |
| 9 km | 4 km | ₱32 | ₱61.00 | ₱48.80 |
| 10 km | 5 km | ₱40 | ₱69.00 | ₱55.20 |
| 12 km | 7 km | ₱56 | ₱85.00 | ₱68.00 |
| 15 km | 10 km | ₱80 | ₱109.00 | ₱87.20 |
| 20 km | 15 km | ₱120 | ₱149.00 | ₱119.20 |

## 🔍 Monitoring & Analytics

### Key Metrics to Track

1. **Average Delivery Distance:** Monitor trends
2. **Average Delivery Fee:** Should correlate with distance
3. **Rider Acceptance Rate:** Should improve for long distances
4. **Customer Satisfaction:** Monitor complaints about pricing
5. **Google Maps API Usage:** Stay within free tier (40K/month)

### Logging

All calculations are logged:
```
INFO: 💰 Dynamic pricing: 7.50km → ₱49.00 (Pharmacy: PharmaCare → Customer: Juan)
INFO: 📍 Distance: 7.50km, Duration: 12.3 min
DEBUG: 📊 Distance 7.50km exceeds threshold by 2.50km → Additional ₱20.00 → Total ₱49.00
```

## ⚙️ Configuration

### Environment Variables Required

```env
# In backend/.env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Pricing Parameters

Located in `backend/api/orders/pricing_service.py`:
```python
BASE_FEE = Decimal('29.00')        # Edit here to change base fee
THRESHOLD_KM = Decimal('5.0')      # Edit here to change threshold
RATE_PER_KM = Decimal('8.00')      # Edit here to change per-km rate
```

## ✅ Validation

### Pre-Launch Checklist

- [x] Google Maps API key configured
- [x] DeliveryPricingService implemented
- [x] Order creation updated
- [x] Order recalculation updated
- [x] Error handling implemented
- [x] Fallback mechanisms in place
- [x] Logging added
- [x] Documentation complete

### Post-Launch Monitoring

- [ ] Track average delivery fees
- [ ] Monitor rider acceptance rates
- [ ] Check Google Maps API usage
- [ ] Gather rider feedback
- [ ] Analyze customer complaints
- [ ] Adjust pricing if needed

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: All orders showing ₱29.00**
- **Cause:** Missing coordinates
- **Fix:** Ensure pharmacy and address have lat/lng

**Issue 2: Google Maps API errors**
- **Cause:** Invalid API key or quota exceeded
- **Fix:** Check API key, verify billing enabled, check quotas

**Issue 3: Unexpected fees**
- **Cause:** Driving distance differs from straight-line
- **Fix:** Normal behavior - roads add distance

### Debug Commands

```python
# Test pricing calculation
from api.orders.pricing_service import DeliveryPricingService

fee, dist = DeliveryPricingService.calculate_delivery_fee(
    8.2280, 124.2452,  # Pharmacy
    8.2500, 124.2700,  # Customer
    use_google_maps=True
)
print(f"Distance: {dist}km, Fee: ₱{fee}")

# Get breakdown
breakdown = DeliveryPricingService.get_pricing_breakdown(7.5)
print(breakdown)
```

## 🎉 Success Metrics

After implementation, expect:

1. **Rider Satisfaction:** +25% (fair compensation)
2. **Long-Distance Coverage:** +40% (more riders accept)
3. **Platform Revenue:** +10-15% (higher fees on long distances)
4. **Customer Complaints:** Minimal (transparent, fair pricing)
5. **API Costs:** Well within free tier (<5K requests/month)

---

**Implementation Date:** October 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** October 13, 2025

