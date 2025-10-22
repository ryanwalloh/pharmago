"""
Comprehensive test for all mobile app API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_endpoint(name, url, method='GET', data=None, expected_status=200):
    """Test a single endpoint"""
    print(f"\n{'='*80}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"Method: {method}")
    print('='*80)
    
    try:
        if method == 'GET':
            response = requests.get(url)
        elif method == 'POST':
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == 'PUT':
            response = requests.put(url, json=data, headers={'Content-Type': 'application/json'})
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == expected_status:
            print(f"✅ SUCCESS - Got expected status {expected_status}")
            try:
                resp_data = response.json()
                if isinstance(resp_data, dict) and 'success' in resp_data:
                    print(f"Response success: {resp_data['success']}")
                    if 'count' in resp_data:
                        print(f"Count: {resp_data['count']}")
                    if 'data' in resp_data and isinstance(resp_data['data'], list):
                        print(f"Data items: {len(resp_data['data'])}")
            except:
                pass
        else:
            print(f"⚠️ WARNING - Expected {expected_status}, got {response.status_code}")
            print(f"Response: {response.text[:200]}")
        
        return response.status_code == expected_status
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print(" MOBILE APP API ENDPOINTS COMPREHENSIVE TEST")
    print("="*80)
    
    results = {}
    
    # Test all critical endpoints
    tests = [
        # Search endpoints
        ("Search Medicines", f"{BASE_URL}/search-medicines/?q=para&limit=10", "GET", None, 200),
        ("Search Pharmacies", f"{BASE_URL}/search-pharmacies/?q=pharmacy&limit=10", "GET", None, 200),
        ("Pharmacies by Medicine", f"{BASE_URL}/pharmacies-by-medicine/?medicine_name=Alaxan&dosage=200mg&form=tablet", "GET", None, 200),
        ("Calculate Distance", f"{BASE_URL}/calculate-distance-and-fee/?pharmacy_lat=8.23085822454845&pharmacy_lng=124.24536327947378&customer_lat=8.23085822454845&customer_lng=124.24536327947378", "GET", None, 200),
        ("Search Pharmacy Inventory", f"{BASE_URL}/search-pharmacy-inventory/34/?q=alaxan&limit=20", "GET", None, 200),
        
        # Address endpoints
        ("Get Customer Addresses", f"{BASE_URL}/customer-addresses/24/", "GET", None, 200),
        ("Get Default Address", f"{BASE_URL}/default-address/24/", "GET", None, 200),
        
        # Pharmacy/Admin endpoints
        ("Active Pharmacies", f"{BASE_URL}/active-pharmacies/", "GET", None, 200),
        ("Pending Pharmacies", f"{BASE_URL}/pending-pharmacies/", "GET", None, 200),
        ("Medicine Categories", f"{BASE_URL}/medicine-categories/", "GET", None, 200),
        ("Medicine Catalog", f"{BASE_URL}/medicine-catalog/", "GET", None, 200),
        ("Pharmacy Inventory", f"{BASE_URL}/pharmacy-inventory/34/", "GET", None, 200),
        ("Pharmacy Orders", f"{BASE_URL}/pharmacy-orders/34/", "GET", None, 200),
        
        # Order/Prescription endpoints
        ("Order Status", f"{BASE_URL}/order-status/1/", "GET", None, None),  # May be 200 or 404
        
        # Test endpoint
        ("Test API", f"{BASE_URL}/test/", "GET", None, 200),
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        name, url, method, data, expected_status = test
        if expected_status is None:
            # Don't count endpoints where we don't care about status
            test_endpoint(name, url, method, data, 200)
        else:
            result = test_endpoint(name, url, method, data, expected_status)
            results[name] = result
            if result:
                passed += 1
            else:
                failed += 1
    
    # Summary
    print("\n" + "="*80)
    print(" TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Total: {passed + failed}")
    
    if failed > 0:
        print("\nFailed tests:")
        for name, result in results.items():
            if not result:
                print(f"  - {name}")
    else:
        print("\n🎉 All critical endpoints are working!")
    
    print("="*80)

if __name__ == "__main__":
    print("\n🚀 Starting comprehensive mobile app API test...")
    print("📍 Base URL:", BASE_URL)
    print("\nMake sure the Django development server is running on localhost:8000")
    input("Press Enter to start tests...")
    main()

