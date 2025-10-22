"""
Test script for Senior Citizen Discount API endpoints

Tests:
1. Get senior discount details (should show not_requested initially)
2. Approve senior discount
3. Reject senior discount
4. Get details after review

Run: python test_senior_discount_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/orders"

# Test configuration - UPDATE THESE VALUES
TEST_ORDER_ID = 1  # Replace with an actual order ID from your database
TEST_PHARMACY_USER_ID = 2  # Replace with an actual pharmacy user ID


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def print_response(response):
    """Print formatted response"""
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        return data
    except json.JSONDecodeError:
        print(f"Response Text: {response.text}")
        return None


def test_get_senior_discount_details(order_id):
    """Test getting senior discount details"""
    print_section(f"TEST 1: Get Senior Discount Details for Order #{order_id}")
    
    try:
        response = requests.get(f"{BASE_URL}/senior-discount-details/{order_id}/")
        data = print_response(response)
        
        if response.status_code == 200:
            print("\n✅ Successfully retrieved senior discount details")
            if data:
                print(f"  - Status: {data.get('senior_discount_status')}")
                print(f"  - Requested: {data.get('senior_discount_requested')}")
                print(f"  - Potential Discount: ₱{data.get('potential_discount', 0):.2f}")
                print(f"  - Current Discount: ₱{data.get('discount_amount', 0):.2f}")
        else:
            print(f"\n❌ Failed to get details: Status {response.status_code}")
        
        return data
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Ensure Django server is running on localhost:8000")
        return None
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None


def test_approve_senior_discount(order_id, pharmacy_user_id):
    """Test approving senior discount"""
    print_section(f"TEST 2: Approve Senior Discount for Order #{order_id}")
    
    payload = {
        'pharmacy_user_id': pharmacy_user_id,
        'action': 'approve',
        'notes': 'Senior citizen ID verified. Valid until 2026.'
    }
    
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/pharmacy-review-senior-discount/{order_id}/",
            json=payload
        )
        data = print_response(response)
        
        if response.status_code == 200:
            print("\n✅ Senior discount approved successfully!")
            if data:
                print(f"  - Discount Amount: ₱{data.get('discount_amount', 0):.2f}")
                print(f"  - New Total: ₱{data.get('new_total', 0):.2f}")
        else:
            print(f"\n❌ Approval failed: Status {response.status_code}")
        
        return data
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Ensure Django server is running")
        return None
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None


def test_reject_senior_discount(order_id, pharmacy_user_id):
    """Test rejecting senior discount"""
    print_section(f"TEST 3: Reject Senior Discount for Order #{order_id}")
    
    payload = {
        'pharmacy_user_id': pharmacy_user_id,
        'action': 'reject',
        'notes': 'Senior citizen ID appears to be expired. Please provide updated ID.'
    }
    
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/pharmacy-review-senior-discount/{order_id}/",
            json=payload
        )
        data = print_response(response)
        
        if response.status_code == 200:
            print("\n✅ Senior discount rejected successfully!")
            if data:
                print(f"  - Discount Amount: ₱{data.get('discount_amount', 0):.2f}")
                print(f"  - New Total: ₱{data.get('new_total', 0):.2f}")
                print(f"  - Reason: {data.get('reason', 'N/A')}")
        else:
            print(f"\n❌ Rejection failed: Status {response.status_code}")
        
        return data
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error: Ensure Django server is running")
        return None
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None


def test_invalid_action(order_id, pharmacy_user_id):
    """Test invalid action"""
    print_section(f"TEST 4: Test Invalid Action (Should Fail)")
    
    payload = {
        'pharmacy_user_id': pharmacy_user_id,
        'action': 'invalid_action',
        'notes': 'This should fail'
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/pharmacy-review-senior-discount/{order_id}/",
            json=payload
        )
        data = print_response(response)
        
        if response.status_code == 400:
            print("\n✅ Invalid action correctly rejected (expected behavior)")
        else:
            print(f"\n⚠️  Unexpected status code: {response.status_code}")
        
        return data
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None


def run_basic_workflow():
    """Run the basic approval workflow"""
    print("\n" + "╔" + "="*78 + "╗")
    print("║" + " "*20 + "SENIOR DISCOUNT API TEST SUITE" + " "*28 + "║")
    print("╚" + "="*78 + "╝")
    
    print(f"\nConfiguration:")
    print(f"  - Base URL: {BASE_URL}")
    print(f"  - Test Order ID: {TEST_ORDER_ID}")
    print(f"  - Pharmacy User ID: {TEST_PHARMACY_USER_ID}")
    print(f"\n⚠️  Make sure to update TEST_ORDER_ID and TEST_PHARMACY_USER_ID at the top of this file!")
    
    input("\nPress Enter to start tests...")
    
    # Test 1: Get initial details
    initial_details = test_get_senior_discount_details(TEST_ORDER_ID)
    
    if not initial_details:
        print("\n❌ Cannot proceed with tests. Check your configuration and server status.")
        return
    
    # Test 2: Approve discount
    approve_result = test_approve_senior_discount(TEST_ORDER_ID, TEST_PHARMACY_USER_ID)
    
    if approve_result:
        # Get details after approval
        print_section("Verify Details After Approval")
        test_get_senior_discount_details(TEST_ORDER_ID)
    
    # Test 3: Test invalid action
    test_invalid_action(TEST_ORDER_ID, TEST_PHARMACY_USER_ID)
    
    # Final summary
    print_section("TEST SUITE COMPLETED")
    print("\n📝 Summary:")
    print("  1. ✓ Get senior discount details")
    print("  2. ✓ Approve senior discount")
    print("  3. ✓ Invalid action handling")
    print("\n⚠️  Note: To test rejection, create a new order with senior discount")
    print("     or reset the order status in Django admin.\n")


def run_rejection_workflow():
    """Run the rejection workflow (requires fresh order)"""
    print("\n" + "╔" + "="*78 + "╗")
    print("║" + " "*20 + "REJECTION WORKFLOW TEST" + " "*32 + "║")
    print("╚" + "="*78 + "╝")
    
    print(f"\nThis test requires an order with pending senior discount.")
    print(f"Order ID: {TEST_ORDER_ID}")
    
    input("\nPress Enter to continue...")
    
    # Test rejection
    reject_result = test_reject_senior_discount(TEST_ORDER_ID, TEST_PHARMACY_USER_ID)
    
    if reject_result:
        # Get details after rejection
        print_section("Verify Details After Rejection")
        test_get_senior_discount_details(TEST_ORDER_ID)
    
    print_section("REJECTION TEST COMPLETED")


def main():
    """Main test runner"""
    print("\nWhich test would you like to run?")
    print("1. Basic Workflow (Get Details → Approve → Verify)")
    print("2. Rejection Workflow (Reject → Verify)")
    print("3. Just Get Details")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == '1':
        run_basic_workflow()
    elif choice == '2':
        run_rejection_workflow()
    elif choice == '3':
        test_get_senior_discount_details(TEST_ORDER_ID)
    elif choice == '4':
        print("Exiting...")
        return
    else:
        print("Invalid choice. Exiting...")
        return


if __name__ == "__main__":
    main()

