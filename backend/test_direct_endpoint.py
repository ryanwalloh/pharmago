#!/usr/bin/env python3
"""
Test script for the direct user registration endpoint
"""
import requests
import json

def test_direct_registration():
    url = "http://192.168.254.103:8000/api/user-register/"
    
    data = {
        "username": "testmobile123",
        "email": "testmobile123@example.com",
        "password": "Test123!",
        "password_confirm": "Test123!",
        "first_name": "Test",
        "last_name": "Mobile",
        "phone": "639123456789",
        "role": "customer"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"Testing direct registration endpoint: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Content: {response.text}")
        
        if response.status_code == 200:
            print("✅ Registration successful!")
        else:
            print("❌ Registration failed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_direct_registration()
