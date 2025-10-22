import requests
import json

# Test pharmacy inventory search endpoint
BASE_URL = 'http://localhost:8000/api/direct'

def test_search_inventory():
    print("Testing pharmacy inventory search endpoint...")
    print("=" * 60)
    
    # Test with pharmacy ID 16 (Alyssa Pharmacy)
    pharmacy_id = 16
    query = "bio"
    
    url = f"{BASE_URL}/search-pharmacy-inventory/{pharmacy_id}/?q={query}"
    
    print(f"\n🔍 Testing: {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Response:")
            print(json.dumps(data, indent=2))
        else:
            print(f"\n❌ Error Response:")
            print(response.text)
            
    except Exception as e:
        print(f"\n💥 Exception: {e}")

if __name__ == "__main__":
    test_search_inventory()

