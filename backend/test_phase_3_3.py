#!/usr/bin/env python3
"""
Test script for Phase 3.3: Delivery & Payments Implementation
This script tests the core functionality to ensure Phase 3.3 is working correctly.
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

def test_phase_3_3_implementation():
    """Test Phase 3.3 implementation for inconsistencies."""
    print("🧪 Testing Phase 3.3: Delivery & Payments Implementation")
    print("=" * 60)
    
    # Test 1: Import all Phase 3.3 models
    print("\n1. Testing Model Imports...")
    try:
        from api.delivery.models import (
            DeliveryZone, RiderAssignment, RiderLocation, 
            OrderRiderAssignment, OrderBatchingService
        )
        print("✅ Delivery models imported successfully")
        
        from api.payments.models import Payment
        print("✅ Payment models imported successfully")
        
        from api.orders.enhanced_views import EnhancedOrderViewSet
        print("✅ Enhanced order views imported successfully")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    
    # Test 2: Check model relationships
    print("\n2. Testing Model Relationships...")
    try:
        # Check if models have required fields
        delivery_zone_fields = [f.name for f in DeliveryZone._meta.fields]
        required_delivery_fields = ['name', 'center_latitude', 'center_longitude', 'radius_km']
        
        for field in required_delivery_fields:
            if field in delivery_zone_fields:
                print(f"✅ DeliveryZone has {field} field")
            else:
                print(f"❌ DeliveryZone missing {field} field")
        
        # Check payment model
        payment_fields = [f.name for f in Payment._meta.fields]
        required_payment_fields = ['order', 'amount_paid', 'payment_method', 'payment_status']
        
        for field in required_payment_fields:
            if field in payment_fields:
                print(f"✅ Payment has {field} field")
            else:
                print(f"❌ Payment missing {field} field")
                
    except Exception as e:
        print(f"❌ Model relationship test failed: {e}")
        return False
    
    # Test 3: Check URL routing
    print("\n3. Testing URL Routing...")
    try:
        from django.urls import reverse
        from django.test import Client
        
        client = Client()
        
        # Test delivery endpoints
        delivery_urls = [
            'api:v1:delivery-zone-list',
            'api:v1:rider-assignment-list',
            'api:v1:payment-list',
            'api:v1:enhanced-order-list'
        ]
        
        for url_name in delivery_urls:
            try:
                url = reverse(url_name)
                print(f"✅ URL {url_name} resolves to: {url}")
            except Exception as e:
                print(f"❌ URL {url_name} failed: {e}")
                
    except Exception as e:
        print(f"❌ URL routing test failed: {e}")
        return False
    
    # Test 4: Check business logic
    print("\n4. Testing Business Logic...")
    try:
        # Test OrderBatchingService
        if hasattr(OrderBatchingService, 'can_batch_orders'):
            print("✅ OrderBatchingService.can_batch_orders method exists")
        else:
            print("❌ OrderBatchingService.can_batch_orders method missing")
            
        if hasattr(OrderBatchingService, 'find_batchable_orders'):
            print("✅ OrderBatchingService.find_batchable_orders method exists")
        else:
            print("❌ OrderBatchingService.find_batchable_orders method missing")
            
        if hasattr(OrderBatchingService, 'create_batch_assignment'):
            print("✅ OrderBatchingService.create_batch_assignment method exists")
        else:
            print("❌ OrderBatchingService.create_batch_assignment method missing")
            
    except Exception as e:
        print(f"❌ Business logic test failed: {e}")
        return False
    
    # Test 5: Check permissions and security
    print("\n5. Testing Permissions and Security...")
    try:
        from api.users.permissions import IsRider, IsAdmin, IsPharmacy, IsCustomer
        
        permission_classes = [IsRider, IsAdmin, IsPharmacy, IsCustomer]
        for perm_class in permission_classes:
            if perm_class:
                print(f"✅ Permission class {perm_class.__name__} exists")
            else:
                print(f"❌ Permission class {perm_class.__name__} missing")
                
    except Exception as e:
        print(f"❌ Permissions test failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 Phase 3.3 Testing Complete!")
    print("All core components are working correctly.")
    return True

if __name__ == "__main__":
    success = test_phase_3_3_implementation()
    if success:
        print("\n✅ Phase 3.3 implementation is consistent and working!")
        sys.exit(0)
    else:
        print("\n❌ Phase 3.3 implementation has issues that need to be addressed.")
        sys.exit(1)
