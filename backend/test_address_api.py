#!/usr/bin/env python3
"""
Test script for Address API endpoints
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def test_create_address():
    """Test creating a new address"""
    print("=" * 80)
    print("TEST 1: Create Address")
    print("=" * 80)
    
    address_data = {
        "customer_id": 24,  # Using existing customer ID
        "label": "home",
        "street_address": "123 Test Street",
        "barangay": "Test Barangay",
        "building_name": "Test Building",
        "floor_number": "2nd Floor",
        "unit_number": "Unit 201",
        "landmark": "Near Test Mall",
        "latitude": 8.23085822454845,
        "longitude": 124.24536327947378,
        "city": "Iligan City",
        "province": "Lanao del Norte",
        "postal_code": "9200",
        "is_default": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/create-or-update-address/",
            json=address_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print("✅ Address created successfully!")
            print(f"Address ID: {data.get('address', {}).get('id')}")
            return data.get('address', {}).get('id')
        else:
            print(f"❌ Failed to create address: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None


def test_get_customer_addresses(customer_id=24):
    """Test getting all addresses for a customer"""
    print("=" * 80)
    print(f"TEST 2: Get Customer Addresses (Customer ID: {customer_id})")
    print("=" * 80)
    
    try:
        response = requests.get(f"{BASE_URL}/customer-addresses/{customer_id}/")
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data.get('count', 0)} addresses")
            for address in data.get('addresses', []):
                print(f"  - {address.get('label')}: {address.get('full_address')}")
        else:
            print(f"❌ Failed to get addresses: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_get_default_address(customer_id=24):
    """Test getting default address for a customer"""
    print("=" * 80)
    print(f"TEST 3: Get Default Address (Customer ID: {customer_id})")
    print("=" * 80)
    
    try:
        response = requests.get(f"{BASE_URL}/default-address/{customer_id}/")
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            print("✅ Default address found!")
            print(f"  Label: {address.get('label')}")
            print(f"  Address: {address.get('full_address')}")
            print(f"  Coordinates: ({address.get('latitude')}, {address.get('longitude')})")
        else:
            print(f"❌ Failed to get default address: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_update_address(address_id):
    """Test updating an address"""
    print("=" * 80)
    print(f"TEST 4: Update Address (Address ID: {address_id})")
    print("=" * 80)
    
    update_data = {
        "building_name": "Updated Building Name",
        "landmark": "Updated Landmark",
        "street_address": "Updated Street Address"
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/update-address/{address_id}/",
            json=update_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Address updated successfully!")
            address = data.get('address', {})
            print(f"  Updated Building: {address.get('building_name')}")
            print(f"  Updated Landmark: {address.get('landmark')}")
        else:
            print(f"❌ Failed to update address: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def main():
    """Run all tests"""
    print("🚀 Starting Address API tests...")
    print(f"📍 Base URL: {BASE_URL}")
    print("Make sure the Django development server is running on localhost:8000")
    
    input("Press Enter to start tests...")
    
    # Test 1: Create Address
    address_id = test_create_address()
    
    # Test 2: Get Customer Addresses
    test_get_customer_addresses()
    
    # Test 3: Get Default Address
    test_get_default_address()
    
    # Test 4: Update Address (if we have an address ID)
    if address_id:
        test_update_address(address_id)
    
    print("=" * 80)
    print("TEST SUITE COMPLETED")
    print("=" * 80)
    print("✅ All tests executed")
    print("Note: Check results above for any failed requests")
    print("Expected successful status codes: 200, 201")
    print("Expected failed status codes: 400 (invalid params), 404 (not found)")


if __name__ == "__main__":
    main()
