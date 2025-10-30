# 💳 Stripe Payment Integration Guide

## Overview
This guide explains how the Stripe payment integration works in PharmGo for card payments (Visa, Mastercard, etc.).

---

## 🚀 Automatic Deployment (Railway)

### Migration Runs Automatically! ✅

When you push to Railway, migrations run automatically via:
- **railway.json**: `python manage.py migrate --noinput`
- **Procfile**: Also configured for migration

**You don't need to do anything manually for Railway!**

---

## 🧪 Local Development Setup

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Migrations
```bash
# Option A: Run all migrations
python manage.py migrate

# Option B: Run only Stripe migration (Windows)
scripts\migrate_stripe.bat

# Option C: Run only Stripe migration (Mac/Linux)
bash scripts/migrate_stripe.sh
```

### 3. Install Frontend Dependencies
```bash
cd mobileapp/apps/customer-app
npm install
```

---

## 🔐 Environment Variables

### Backend (Already set in Railway)
- `STRIPE_SECRET_KEY` - For creating payment intents
- `STRIPE_PUBLISHABLE_KEY` - Shared with mobile app
- `STRIPE_WEBHOOK_SECRET` - For webhook verification

### Frontend (Mobile App)
Add to your `.env` file (copy from `env.template`):
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SMVqmJAiW57btKoSHW90pbFU3X7p6gFFxSFBq1IpatB6vD3LtUsjDShOV470HrGTZnuIUyQt0PDperJ13XfG1ue00iSbUd3Dp
```

---

## 🔄 Payment Flow

### Customer Journey:
1. **Select Items** → Add to cart
2. **Checkout** → Choose "Card" payment method
3. **Place Order** → Order created (status: UNPAID)
4. **Payment Sheet** → Stripe payment UI appears
5. **Enter Card Details** → Stripe processes payment
6. **Payment Success** → Order marked as PAID
7. **Order Tracking** → View order status

### Technical Flow:
```
Mobile App                  Backend                    Stripe
   |                           |                         |
   |-- Place Order ----------->|                         |
   |<-- Order Created ---------|                         |
   |                           |                         |
   |-- Create Payment Intent ->|                         |
   |                           |-- Create Intent ------->|
   |                           |<-- Client Secret -------|
   |<-- Client Secret ---------|                         |
   |                           |                         |
   |-- Show Payment Sheet ---->|                         |
   |-- Enter Card Details ---->|                         |
   |                           |                         |
   |                           |<-- Webhook (Success) ---|
   |                           |-- Update Order to PAID  |
   |                           |                         |
   |-- Confirm Payment ------->|                         |
   |<-- Success ---------------|                         |
   |                           |                         |
   |-- Navigate to Tracking    |                         |
```

---

## 🏗️ Backend Endpoints

### 1. **Create Payment Intent**
- **URL**: `/api/stripe/create-payment-intent/`
- **Method**: `POST`
- **Body**: `{ "order_id": 123 }`
- **Response**: 
```json
{
  "success": true,
  "data": {
    "payment_intent_id": "pi_xxx",
    "client_secret": "pi_xxx_secret_yyy",
    "amount": 500.00,
    "currency": "php"
  }
}
```

### 2. **Webhook Endpoint**
- **URL**: `/api/stripe/webhook/`
- **Method**: `POST`
- **Purpose**: Receives payment confirmation from Stripe
- **Events Handled**:
  - `payment_intent.succeeded` → Mark order as PAID
  - `payment_intent.payment_failed` → Update status to failed
  - `payment_intent.canceled` → Update status to canceled

### 3. **Confirm Payment**
- **URL**: `/api/stripe/confirm-payment/`
- **Method**: `POST`
- **Body**: `{ "order_id": 123, "payment_intent_id": "pi_xxx" }`
- **Purpose**: Double-check payment status after mobile app completion

---

## 📱 Frontend Implementation

### Files Modified:
1. **package.json** - Added `@stripe/stripe-react-native`
2. **app/_layout.tsx** - Initialized StripeProvider
3. **app.json** - Added Stripe publishable key to extra config
4. **checkout.tsx** - Payment flow implementation
5. **services/api.ts** - Stripe API methods

### Key Functions in checkout.tsx:
- `initializeStripePaymentSheet()` - Prepares payment
- `handleStripePayment()` - Shows payment sheet
- `handlePlaceOrder()` - Modified to handle card payments

---

## 🧪 Testing with Stripe Test Cards

### Successful Payment
- **Card**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits

### Declined Payment
- **Card**: `4000 0000 0000 0002`
- Tests payment failure handling

### 3D Secure Authentication
- **Card**: `4000 0027 6000 3184`
- Tests additional authentication

### More Test Cards
See: https://stripe.com/docs/testing#cards

---

## 🔧 Railway Webhook Configuration

### Webhook URL:
```
https://pharmago-backend-production.up.railway.app/api/stripe/webhook/
```

### Setup in Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL above
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy **Signing secret** (already set in Railway as `STRIPE_WEBHOOK_SECRET`)

---

## 📊 Database Changes

### New Fields in `Order` Model:
```python
payment_method = models.CharField(
    max_length=50,
    default='cod',
    choices=[
        ('cod', 'Cash on Delivery'),
        ('card', 'Card (Visa, Mastercard, etc.)'),
        ('gcash', 'GCash'),
        ('paymaya', 'PayMaya'),
        ('bank_transfer', 'Bank Transfer'),
    ]
)

stripe_payment_intent_id = models.CharField(
    max_length=255, 
    blank=True, 
    null=True
)

stripe_payment_status = models.CharField(
    max_length=50, 
    blank=True, 
    null=True
)
```

---

## 🐛 Troubleshooting

### "Payment sheet won't open"
- Check if `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Verify Stripe provider is initialized in `_layout.tsx`
- Check console logs for initialization errors

### "Payment succeeds but order stays UNPAID"
- Check Railway logs for webhook delivery
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint is accessible

### "Migration error on Railway"
- Check Railway logs during deployment
- Verify migration file exists in `api/orders/migrations/`
- Railway automatically runs migrations on deploy

---

## 📝 Deployment Checklist

### Before Pushing:
- ✅ `requirements.txt` includes `stripe==11.1.1`
- ✅ Migration file created
- ✅ Environment variables set in Railway
- ✅ Mobile app has Stripe package in package.json

### After Pushing:
1. Railway will automatically:
   - Install dependencies
   - Run migrations
   - Restart server
2. Test payment flow with test cards
3. Verify webhook is receiving events

---

## 🎯 Next Steps

### For GCash/PayMaya Integration:
Similar pattern can be used with:
- PayMongo API (supports GCash & PayMaya)
- Xendit API
- Paymongo Webhooks

### For Production:
1. Replace test keys with live keys
2. Update webhook URL to production
3. Enable additional security features
4. Add payment receipt generation

---

## 📞 Support

Stripe Documentation: https://stripe.com/docs/payments/accept-a-payment?platform=react-native
Stripe Dashboard: https://dashboard.stripe.com/test/dashboard

