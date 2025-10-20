"""
Test script for Search API endpoints
Run this script to test the search functionality
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api"
HEADERS = {'Content-Type': 'application/json'}


def print_section(title):
    """Print a section header"""
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80 + "\n")


def print_response(response):
    """Pretty print API response"""
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))


def test_search_medicines():
    """Test medicine search endpoint"""
    print_section("TEST 1: Search Medicines")
    
    # Test 1.1: Valid search query
    print("\n[1.1] Testing valid medicine search (query: 'para')...")
    response = requests.get(f"{BASE_URL}/search-medicines/", params={'q': 'para', 'limit': 5})
    print_response(response)
    
    # Test 1.2: Short query (should fail)
    print("\n[1.2] Testing short query (query: 'p')...")
    response = requests.get(f"{BASE_URL}/search-medicines/", params={'q': 'p'})
    print_response(response)
    
    # Test 1.3: Search by dosage
    print("\n[1.3] Testing search by dosage (query: '500mg')...")
    response = requests.get(f"{BASE_URL}/search-medicines/", params={'q': '500mg', 'limit': 5})
    print_response(response)
    
    # Test 1.4: No query parameter
    print("\n[1.4] Testing no query parameter...")
    response = requests.get(f"{BASE_URL}/search-medicines/")
    print_response(response)


def test_search_pharmacies():
    """Test pharmacy search endpoint"""
    print_section("TEST 2: Search Pharmacies")
    
    # Test 2.1: Search by pharmacy name
    print("\n[2.1] Testing pharmacy search (query: 'pharmacy')...")
    response = requests.get(f"{BASE_URL}/search-pharmacies/", params={'q': 'pharmacy', 'limit': 5})
    print_response(response)
    
    # Test 2.2: Search by location
    print("\n[2.2] Testing location search (query: 'Iligan')...")
    response = requests.get(f"{BASE_URL}/search-pharmacies/", params={'q': 'Iligan', 'limit': 5})
    print_response(response)
    
    # Test 2.3: Search by barangay
    print("\n[2.3] Testing barangay search...")
    response = requests.get(f"{BASE_URL}/search-pharmacies/", params={'q': 'San', 'limit': 5})
    print_response(response)


def test_pharmacies_by_medicine():
    """Test get pharmacies by medicine endpoint"""
    print_section("TEST 3: Get Pharmacies by Medicine")
    
    # First, search for a medicine to get valid parameters
    print("\n[3.1] First, searching for a medicine...")
    medicine_response = requests.get(f"{BASE_URL}/search-medicines/", params={'q': 'para', 'limit': 1})
    print_response(medicine_response)
    
    if medicine_response.status_code == 200 and medicine_response.json().get('data'):
        medicine = medicine_response.json()['data'][0]
        medicine_name = medicine['name'].split()[0]  # Get base name
        dosage = medicine['dosage']
        
        # Test 3.2: Get pharmacies with this medicine
        print(f"\n[3.2] Testing get pharmacies for medicine: {medicine_name}, {dosage}...")
        
        # Need to determine form value - let's try common ones
        forms = ['tablet', 'capsule', 'syrup']
        for form in forms:
            print(f"\n[3.2.{forms.index(form)+1}] Trying form: {form}...")
            response = requests.get(
                f"{BASE_URL}/pharmacies-by-medicine/",
                params={
                    'medicine_name': medicine_name,
                    'dosage': dosage,
                    'form': form
                }
            )
            print_response(response)
            if response.json().get('count', 0) > 0:
                break
    else:
        print("\n[3.2] Skipping - no medicines found in database")
    
    # Test 3.3: Missing parameters
    print("\n[3.3] Testing missing parameters...")
    response = requests.get(f"{BASE_URL}/pharmacies-by-medicine/", params={'medicine_name': 'Test'})
    print_response(response)


def test_search_combinations():
    """Test combined search scenarios"""
    print_section("TEST 4: Combined Search Scenarios")
    
    # Test 4.1: Search medicine, then get pharmacies
    print("\n[4.1] Testing complete workflow: Search medicine -> Get pharmacies...")
    
    # Step 1: Search for a common medicine
    print("\nStep 1: Searching for 'paracetamol'...")
    medicine_response = requests.get(f"{BASE_URL}/search-medicines/", params={'q': 'paracetamol', 'limit': 3})
    print_response(medicine_response)
    
    if medicine_response.status_code == 200 and medicine_response.json().get('data'):
        medicines = medicine_response.json()['data']
        if medicines:
            print(f"\nFound {len(medicines)} medicine(s)")
            
            # Step 2: Get pharmacies for first medicine
            first_medicine = medicines[0]
            print(f"\nStep 2: Getting pharmacies for '{first_medicine['name']}'...")
            
            # Extract name parts
            name_parts = first_medicine['name'].split()
            medicine_name = name_parts[0] if name_parts else first_medicine['name']
            
            pharmacy_response = requests.get(
                f"{BASE_URL}/pharmacies-by-medicine/",
                params={
                    'medicine_name': medicine_name,
                    'dosage': first_medicine.get('dosage', '500mg'),
                    'form': 'tablet'  # Assuming tablet form
                }
            )
            print_response(pharmacy_response)


def run_all_tests():
    """Run all tests"""
    print("\n" + "*" * 80)
    print(" SEARCH API COMPREHENSIVE TEST SUITE")
    print("*" * 80)
    
    try:
        test_search_medicines()
    except Exception as e:
        print(f"\n❌ Medicine search test failed: {str(e)}")
    
    try:
        test_search_pharmacies()
    except Exception as e:
        print(f"\n❌ Pharmacy search test failed: {str(e)}")
    
    try:
        test_pharmacies_by_medicine()
    except Exception as e:
        print(f"\n❌ Pharmacies by medicine test failed: {str(e)}")
    
    try:
        test_search_combinations()
    except Exception as e:
        print(f"\n❌ Combined search test failed: {str(e)}")
    
    print_section("TEST SUITE COMPLETED")
    print("✅ All tests executed")
    print("\nNote: Check results above for any failed requests")
    print("Expected successful status codes: 200")
    print("Expected failed status codes: 400 (invalid params), 404 (not found)")


if __name__ == "__main__":
    print("\n🚀 Starting Search API tests...")
    print("📍 Base URL:", BASE_URL)
    print("\nMake sure the Django development server is running on localhost:8000")
    input("\nPress Enter to start tests...")
    
    run_all_tests()

