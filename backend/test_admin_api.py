#!/usr/bin/env python
"""
Test script to verify admin login API endpoint
"""
import requests
import json

def test_admin_login():
    """Test the admin login API endpoint"""
    print("=== Admin Login API Test ===")
    
    # API endpoint
    url = "http://127.0.0.1:8000/api/pharmago-admin/login/"
    
    # Test credentials
    credentials = {
        "username": "devadmin",
        "password": "dev123"
    }
    
    print(f"Testing endpoint: {url}")
    print(f"Credentials: {credentials}")
    
    try:
        # Make the request
        response = requests.post(
            url,
            json=credentials,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Data: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            print("✅ Admin login successful!")
            if 'token' in response_data:
                print(f"Token received: {response_data['token'][:20]}...")
        else:
            print("❌ Admin login failed!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Is the Django server running?")
    except requests.exceptions.Timeout:
        print("❌ Request timed out!")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_debug_endpoint():
    """Test the admin debug endpoint"""
    print("\n=== Admin Debug Endpoint Test ===")
    
    url = "http://127.0.0.1:8000/api/pharmago-admin/debug/"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"Debug Data: {json.dumps(response_data, indent=2)}")
        else:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_admin_login()
    test_debug_endpoint()
