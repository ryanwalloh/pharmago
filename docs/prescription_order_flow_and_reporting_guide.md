## PharmaGo Mobile Prescription Orders & Reporting Guide

This document captures the patterns we implemented for prescription-only orders, how pharmacies see these orders, how to report sales, and how to apply the same pattern to other order types (add-to-cart/direct orders). It also lists the key libraries already in use to avoid duplicate installs.

### Scope
- Mobile app prescription flow: upload → choose pharmacy → payment → address → place order → track order
- Backend direct endpoints for order creation and tracking
- Visibility model for pharmacies without adding a pharmacy FK on Order
- Sales reporting queries and guidance
- Extension pattern for non-prescription orders

---

## Data Model Pattern (Visibility Without Order.pharmacy FK)

- We intentionally do not store a pharmacy FK on Order.
- Pharmacies gain visibility through the relational chain: Order → OrderLine → PharmacyInventory → Pharmacy.
- The API already scopes pharmacy users by joining via order_lines__inventory_item__pharmacy.

Implementation note for prescription-only orders:
- On creation, we ensure at least one OrderLine exists referencing a PharmacyInventory item that belongs to the chosen pharmacy.
- If the pharmacy has no inventory, we create (or reuse) a deterministic placeholder item named "Prescription Review" under a get_or_create category "Custom Products", then create an OrderLine with unit_price=0.
- Result: Order becomes visible to the pharmacy via existing filters, with zero schema changes.

Relevant code (backend):
- backend/api/orders/direct_endpoints.py → direct_prescription_order_creation
- backend/api/orders/views.py → OrderViewSet.get_queryset filters by order_lines__inventory_item__pharmacy=pharmacy

---

## Endpoints

Public (direct) endpoints used by the mobile app (bypass auth middleware):
- POST /api/create-prescription-order/
  - Body: { customer_username, pharmacy_id, prescription_image_url, prescription_notes, address:{...}, payment_method:{...}, prescription_details:{...} }
  - Response: { success, message, data: { order_id, order_number?, order_status, prescription_status, pharmacy_name, delivery_address, ... } }

- GET /api/order-status/{order_id}/
  - Response: { success, data: { order_id, order_number, order_status, prescription_status, payment_status, total_amount, pharmacy_name, delivery_address, ... } }

Other helpful direct endpoints:
- GET /api/active-pharmacies/
- GET /api/pharmacy-inventory/{pharmacy_id}/

---

## Mobile App Flow (Prescription Orders)

Files touched:
- apps/customer-app/components/PrescriptionUploadModal.tsx → stores temporary prescription data in AsyncStorage
- apps/customer-app/screens/PharmacySelectionScreen.tsx → selects pharmacy (persists in AsyncStorage)
- apps/customer-app/screens/PaymentMethodScreen.tsx → selects payment method (persists)
- apps/customer-app/screens/AddressSelectionScreen.tsx → validates address, calls createPrescriptionOrder
- apps/customer-app/screens/OrderTrackingScreen.tsx → shows order status
- apps/customer-app/services/api.ts → createPrescriptionOrder, getOrderStatus

Key behaviors:
- Place Order only confirms success if the server returns a valid order_id. The tracking page navigates only with a valid id; otherwise it falls back to the order cached in AsyncStorage.
- Errors are simplified for the user; only critical issues surface actionable guidance.

---

## Pharmacy Visibility: How Pharmacies See Orders

Pharmacy users see only orders linked to their inventory items via:
- Order → OrderLine → PharmacyInventory → Pharmacy
- Filter used in OrderViewSet:
  - queryset.filter(order_lines__inventory_item__pharmacy=pharmacy).distinct()

Thanks to the placeholder OrderLine creation for prescription-only orders, every prescription order is visible to the selected pharmacy immediately, even when no catalog item was chosen by the customer.

---

## Reporting: Sales for Pharmacies

Use OrderLine scoped to the pharmacy for revenue and counts. Placeholder lines have unit_price=0, so they do not inflate revenue.

Examples (Django ORM):

Revenue (paid & delivered):
```python
from django.db.models import Sum
from api.orders.models import OrderLine

revenue = OrderLine.objects.filter(
    inventory_item__pharmacy=pharmacy,
    order__payment_status='paid',
    order__order_status='delivered',
).aggregate(total=Sum('total_price'))['total'] or 0
```

Distinct order count:
```python
from django.db.models import Count

order_count = (OrderLine.objects
    .filter(inventory_item__pharmacy=pharmacy, order__payment_status='paid')
    .values('order_id').distinct().count())
```

Monthly buckets:
```python
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth

monthly = (OrderLine.objects
    .filter(inventory_item__pharmacy=pharmacy, order__payment_status='paid')
    .annotate(month=TruncMonth('order__created_at'))
    .values('month')
    .annotate(total=Sum('total_price'), orders=Count('order', distinct=True))
    .order_by('month'))
```

Tips:
- To avoid counting placeholder-only orders, add filters such as order__order_status='delivered' or exclude lines with unit_price=0.
- If you later add Order.pharmacy (denormalized), keep filtering by OrderLine for revenue accuracy and use the FK for fast lookups.

---

## Extension Pattern: Non‑Prescription Orders (Add‑to‑Cart / Direct)

Follow the same relationship pattern:
1) Ensure each selected item maps to a PharmacyInventory belonging to a single pharmacy.
2) Create Order with customer, address, payment, etc.
3) Create OrderLine per cart item with unit_price and total_price.
4) Compute and store subtotal, tax_amount, delivery_fee, discount_amount, total_amount on the Order.
5) Pharmacy visibility works automatically via OrderLine.

If multi‑pharmacy carts are out of scope, validate that all items belong to the same pharmacy before order creation; otherwise, split into multiple orders (one per pharmacy).

---

## Libraries In Use (Avoid Re‑installing)

Backend (backend/requirements.txt):
- Django 5.2.5, djangorestframework 3.16.1
- django-filter, django-cors-headers, python-dotenv
- djangorestframework-simplejwt (JWT)
- drf-spectacular (OpenAPI)
- psycopg2-binary (PostgreSQL)
- boto3, django-storages, Pillow
- django-redis, redis, django-cacheops

Mobile (root mobileapp/package.json and apps/customer-app/package.json):
- Expo SDK 54 (~), expo-router ~6, React Native 0.81.4, React 19.1.0
- @react-native-async-storage/async-storage 2.2.0
- expo-image-picker, expo-location, expo-camera, expo-constants, expo-font, expo-haptics, expo-image, expo-linear-gradient, expo-linking, expo-splash-screen, expo-status-bar, expo-symbols, expo-system-ui, expo-web-browser
- react-native-gesture-handler, react-native-screens, react-native-safe-area-context, react-native-svg
- react-native-reanimated ~4.1.0, react-native-worklets 0.5.1
- react-native-maps 1.20.1 (used via dev client)
- @expo/vector-icons

Notes:
- react-native-maps requires a dev client (not Expo Go). Use `npx expo run:android` and `expo start --dev-client -c`.
- Keep versions aligned across root and app to avoid duplicate installs.

---

## Operational Notes

Local dev
- Backend: `cd backend && venv\\Scripts\\python.exe manage.py runserver 0.0.0.0:8000`
- Ensure Windows Firewall allows Python for private networks; phone and PC must be on the same LAN.

Mobile dev client
- Build once: `cd mobileapp/apps/customer-app && npx expo run:android`
- Start metro: `npx expo start --dev-client -c`

Error‑handling conventions
- Only show success UI after server confirms a valid order_id.
- If order id is missing, do not navigate to tracking; show a concise “Order Not Saved” message.
- Tracking screen falls back to AsyncStorage when route id is not provided.

---

## Future Enhancements (Optional)

- Add Order.pharmacy FK for simpler lookups, keep OrderLine-based reporting for accuracy.
- Add chat kick‑off upon order creation (OrderChatMessage) to notify pharmacies immediately.
- Add background upload for prescription_image_url to S3 and store permanent URL on the order.

---

## Summary

- Visibility and reporting rely on OrderLine linking to PharmacyInventory of the chosen pharmacy.
- Prescription‑only orders are made visible by a deterministic placeholder OrderLine.
- Sales reporting aggregates over OrderLine scoped to the pharmacy, naturally excluding zero‑priced placeholder lines.
- The same pattern applies cleanly to non‑prescription orders (cart/direct): create Order, create OrderLines, and totals on Order.


