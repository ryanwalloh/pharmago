"""
Direct cart order creation endpoint for mobile app
Handles orders from SuperSearch/Cart flow (items already selected with prices)
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
async def create_cart_order(request):
    """
    Create order from cart (SuperSearch/Cart flow).
    Items are already selected with known prices.
    
    Expected JSON body:
    {
        "customer_id": 9,
        "pharmacy_id": 5,
        "delivery_address_id": 12,
        "cart_items": [
            {
                "inventory_id": 123,
                "quantity": 2
            }
        ],
        "delivery_fee": 45.42,
        "payment_method": "cod",
        "senior_discount_requested": false,
        "senior_id_image_url": "",
        "notes": ""
    }
    """
    try:
        payload = json.loads(request.body or '{}')
        logger.info(f"🛒 Cart order creation payload: {payload}")

        # Import models
        from api.users.models import Customer, Pharmacy
        from api.locations.models import Address
        from api.orders.models import Order, OrderLine
        from api.inventory.models import PharmacyInventory
        from api.users.models import UserDocument
        from channels.db import database_sync_to_async

        customer_id = payload.get('customer_id')
        pharmacy_id = payload.get('pharmacy_id')
        delivery_address_id = payload.get('delivery_address_id')
        cart_items = payload.get('cart_items', [])
        delivery_fee = payload.get('delivery_fee', 0.00)
        payment_method = payload.get('payment_method', 'cod')
        senior_discount_requested = payload.get('senior_discount_requested', False)
        senior_id_image_url = payload.get('senior_id_image_url', '')
        notes = payload.get('notes', '')

        if not customer_id:
            return JsonResponse({
                'success': False,
                'error': 'Customer ID is required'
            }, status=400)

        if not pharmacy_id:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy ID is required'
            }, status=400)

        if not delivery_address_id:
            return JsonResponse({
                'success': False,
                'error': 'Delivery address ID is required'
            }, status=400)

        if not cart_items:
            return JsonResponse({
                'success': False,
                'error': 'Cart items are required'
            }, status=400)

        @database_sync_to_async
        def process_order():
            try:
                customer = Customer.objects.get(id=customer_id)
                logger.info(f"✅ Customer found: {customer.full_name} (ID: {customer_id})")
            except Customer.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': f'Customer not found with ID {customer_id}'
                }

            try:
                pharmacy = Pharmacy.objects.get(id=pharmacy_id)
                logger.info(f"✅ Pharmacy found: {pharmacy.pharmacy_name} (ID: {pharmacy_id})")
            except Pharmacy.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': f'Pharmacy not found with ID {pharmacy_id}'
                }

            try:
                delivery_address = Address.objects.get(id=delivery_address_id, customer=customer)
                logger.info(f"✅ Delivery address found: {delivery_address.full_address}")
            except Address.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': 'Delivery address not found or does not belong to customer'
                }

            with transaction.atomic():
                subtotal = Decimal('0.00')
                order_lines_data = []

                for item_data in cart_items:
                    inventory_id = item_data.get('inventory_id')
                    quantity = item_data.get('quantity', 1)

                    if not inventory_id:
                        continue

                    try:
                        inventory_item = PharmacyInventory.objects.get(
                            id=inventory_id,
                            pharmacy=pharmacy,
                            is_available=True
                        )

                        unit_price = inventory_item.price
                        total_price = unit_price * quantity
                        subtotal += total_price

                        order_lines_data.append({
                            'inventory_item': inventory_item,
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'total_price': total_price,
                            'prescription_required': inventory_item.prescription_required
                        })

                        logger.info(f"  📦 {quantity}x {inventory_item.name} @ ₱{unit_price} = ₱{total_price}")

                    except PharmacyInventory.DoesNotExist:
                        logger.warning(f"  ⚠️ Inventory item {inventory_id} not found or unavailable")
                        continue

                if not order_lines_data:
                    return 400, {
                        'success': False,
                        'error': 'No valid items in cart'
                    }

                logger.info(f"💰 Subtotal: ₱{subtotal}")

                service_fee = Decimal('19.00')
                if senior_discount_requested and senior_id_image_url:
                    service_fee = Decimal('0.00')
                    logger.info(f"💚 Service fee waived for senior citizen")

                discount_amount = Decimal('0.00')
                senior_discount_status = 'not_requested'

                if senior_discount_requested and senior_id_image_url:
                    discount_amount = subtotal * Decimal('0.20')
                    senior_discount_status = 'pending'
                    logger.info(f"💚 Senior discount: ₱{discount_amount} (20% off ₱{subtotal})")

                total_amount = subtotal + service_fee + Decimal(str(delivery_fee)) - discount_amount

                logger.info("💰 Order Calculation:")
                logger.info(f"  - Subtotal: ₱{subtotal}")
                logger.info(f"  - Service Fee: ₱{service_fee}")
                logger.info(f"  - Delivery Fee: ₱{delivery_fee}")
                logger.info(f"  - Senior Discount: ₱{discount_amount}")
                logger.info(f"  - Total: ₱{total_amount}")

                order = Order.objects.create(
                    customer=customer,
                    delivery_address=delivery_address,
                    order_status=Order.OrderStatus.PENDING,
                    payment_status=Order.PaymentStatus.UNPAID,
                    payment_method=payment_method,
                    delivery_type=Order.DeliveryType.STANDARD,
                    subtotal=subtotal,
                    tax_amount=service_fee,
                    delivery_fee=Decimal(str(delivery_fee)),
                    discount_amount=discount_amount,
                    total_amount=total_amount,
                    source='mobile',
                    notes=notes or 'Cart order from mobile app',
                    senior_discount_requested=senior_discount_requested,
                    senior_citizen_id_image=senior_id_image_url if senior_discount_requested else '',
                    senior_discount_status=senior_discount_status
                )

                logger.info(f"✅ Order created: {order.order_number} (ID: {order.id})")

                for line_data in order_lines_data:
                    OrderLine.objects.create(
                        order=order,
                        inventory_item=line_data['inventory_item'],
                        quantity=line_data['quantity'],
                        unit_price=line_data['unit_price'],
                        total_price=line_data['total_price'],
                        prescription_required=line_data['prescription_required'],
                        prescription_status='pending' if line_data['prescription_required'] else None,
                        notes=''
                    )

                logger.info(f"✅ Created {len(order_lines_data)} order lines")

                pharmacy_storefront_url = None
                try:
                    storefront_doc = UserDocument.objects.filter(
                        user=pharmacy.user,
                        id_type__name__icontains='storefront'
                    ).first()

                    if storefront_doc and storefront_doc.file_url:
                        if 'cloudinary.com' in storefront_doc.file_url or storefront_doc.file_url.startswith('http'):
                            pharmacy_storefront_url = storefront_doc.file_url
                            logger.info(f"✅ Cart Order: Using Cloudinary URL for pharmacy {pharmacy.id}: {pharmacy_storefront_url}")
                    else:
                        logger.warning(f"⚠️ Cart Order: No storefront document/URL found for pharmacy {pharmacy.id}")
                except Exception as doc_err:
                    logger.error(f"❌ Cart Order: Could not fetch pharmacy storefront: {doc_err}", exc_info=True)

                items_list = []
                for line in order.order_lines.all():
                    items_list.append({
                        'name': line.inventory_item.name,
                        'quantity': line.quantity,
                        'unit_price': float(line.unit_price),
                        'total_price': float(line.total_price),
                        'prescription_required': line.prescription_required
                    })

                logger.info(f"📦 Cart Order Response: pharmacy_storefront_image_url = {pharmacy_storefront_url}")

                response_payload = {
                    'success': True,
                    'message': 'Order created successfully',
                    'order': {
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'order_status': order.order_status,
                        'payment_status': order.payment_status,
                        'payment_method': payment_method,
                        'subtotal': float(order.subtotal),
                        'service_fee': float(order.tax_amount),
                        'delivery_fee': float(order.delivery_fee),
                        'senior_discount': float(order.discount_amount),
                        'senior_discount_requested': order.senior_discount_requested,
                        'senior_discount_status': order.senior_discount_status,
                        'total_amount': float(order.total_amount),
                        'items': items_list,
                        'pharmacy_name': pharmacy.pharmacy_name,
                        'pharmacy_id': pharmacy.id,
                        'pharmacy_barangay': pharmacy.barangay,
                        'pharmacy_latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
                        'pharmacy_longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
                        'pharmacy_phone': pharmacy.business_phone,
                        'pharmacy_email': pharmacy.business_email,
                        'pharmacy_storefront_image_url': pharmacy_storefront_url,
                        'delivery_address': delivery_address.full_address,
                        'delivery_latitude': float(delivery_address.latitude) if delivery_address.latitude else None,
                        'delivery_longitude': float(delivery_address.longitude) if delivery_address.longitude else None,
                        'created_at': order.created_at.isoformat(),
                        'estimated_delivery': None,
                        'notes': order.notes
                    }
                }

                return 201, response_payload

        status_code, payload_response = await process_order()
        return JsonResponse(payload_response, status=status_code)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON payload'
        }, status=400)
    
    except Exception as e:
        logger.error(f"❌ Failed to create cart order: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': 'Failed to create cart order',
            'message': str(e)
        }, status=500)

