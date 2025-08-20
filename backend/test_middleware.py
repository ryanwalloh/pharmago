#!/usr/bin/env python3
"""
Simple test script to demonstrate middleware functionality.
Run this after starting your Django server to test the middleware.
"""

import requests
import json
import time

# Base URL for your Django API
BASE_URL = "http://localhost:8000"

def test_get_request():
    """Test GET request to see middleware in action."""
    print("=" * 50)
    print("Testing GET request...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/middleware-test/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("\nCustom Headers added by middleware:")
        for key, value in response.headers.items():
            if key.startswith('X-'):
                print(f"  {key}: {value}")
    except Exception as e:
        print(f"Error: {e}")

def test_post_request():
    """Test POST request to see middleware in action."""
    print("\n" + "=" * 50)
    print("Testing POST request...")
    print("=" * 50)
    
    try:
        data = {"message": "Hello from middleware test!"}
        response = requests.post(
            f"{BASE_URL}/api/middleware-test/",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("\nCustom Headers added by middleware:")
        for key, value in response.headers.items():
            if key.startswith('X-'):
                print(f"  {key}: {value}")
    except Exception as e:
        print(f"Error: {e}")

def test_health_check():
    """Test health check endpoint."""
    print("\n" + "=" * 50)
    print("Testing health check...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/health/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("\nCustom Headers added by middleware:")
        for key, value in response.headers.items():
            if key.startswith('X-'):
                print(f"  {key}: {value}")
    except Exception as e:
        print(f"Error: {e}")

def test_exception_middleware():
    """Test exception handling middleware."""
    print("\n" + "=" * 50)
    print("Testing exception middleware...")
    print("=" * 50)
    
    try:
        data = {"raise_error": True}
        response = requests.post(
            f"{BASE_URL}/api/test-exception/",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print("Note: Check your Django logs to see the exception middleware in action!")
    except Exception as e:
        print(f"Error: {e}")

def main():
    """Run all tests."""
    print("Middleware Integration Test Suite")
    print("Make sure your Django server is running on localhost:8000")
    print("Check the Django console/logs to see middleware logging output")
    print()
    
    # Wait a moment for user to read
    time.sleep(2)
    
    test_get_request()
    test_post_request()
    test_health_check()
    test_exception_middleware()
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("Check your Django console/logs to see the middleware logging output")
    print("=" * 50)

if __name__ == "__main__":
    main()
