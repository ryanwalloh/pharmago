# Search API Testing Guide

## Overview
This guide explains how to test the new Search API endpoints before implementing the frontend UI.

## Endpoints Created

### 1. Search Medicines
**Endpoint:** `GET /api/medicines/`
**Parameters:**
- `q` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 10)

**Response:** List of medicines with pharmacy availability and price ranges

### 2. Search Pharmacies
**Endpoint:** `GET /api/pharmacies/`
**Parameters:**
- `q` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 10)

**Response:** List of pharmacies matching search query

### 3. Get Pharmacies by Medicine
**Endpoint:** `GET /api/pharmacies-by-medicine/`
**Parameters:**
- `medicine_name` (required): Medicine name
- `dosage` (required): Dosage (e.g., "500mg")
- `form` (required): Form (e.g., "tablet", "capsule", "syrup")

**Response:** List of pharmacies that have this medicine in stock, with pricing

## Running the Tests

### Prerequisites
1. Django development server must be running:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Install requests library (if not already installed):
   ```bash
   pip install requests
   ```

### Execute Test Script
```bash
cd backend
python test_search_api.py
```

### What the Tests Do
1. **Medicine Search Tests:**
   - Valid search query
   - Invalid short query (error handling)
   - Search by dosage
   - Missing query parameter (error handling)

2. **Pharmacy Search Tests:**
   - Search by pharmacy name
   - Search by location/city
   - Search by barangay

3. **Pharmacies by Medicine Tests:**
   - Get pharmacies for a specific medicine
   - Test missing parameters (error handling)

4. **Combined Workflow Test:**
   - Search for medicine → Get pharmacies that have it

## Expected Results
- ✅ Status 200: Successful requests
- ⚠️ Status 400: Invalid parameters (expected for error handling tests)
- 🔍 Each endpoint should return properly formatted JSON
- 📊 Medicine results should include price ranges and pharmacy counts
- 🏥 Pharmacy results should include location data (lat/long)

## Troubleshooting

### No results found?
- Make sure you have medicines in the PharmacyInventory table
- Ensure pharmacies have status='approved'
- Check that medicines have is_available=True

### Connection refused?
- Verify Django server is running on localhost:8000
- Check for any port conflicts

### Import errors?
- Ensure all models are properly migrated
- Check that the search app is in INSTALLED_APPS

## Next Steps
After confirming all tests pass:
1. ✅ Backend API is working
2. ➡️ Ready to implement frontend UI
3. ➡️ Add search methods to frontend api.ts
4. ➡️ Build real-time search component
5. ➡️ Create medicine selection UI
6. ➡️ Build pharmacy list modal

