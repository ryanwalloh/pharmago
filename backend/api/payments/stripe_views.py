"""
Stripe payment processing endpoints
Handles payment intent creation and webhook processing
"""
import json
import os
import stripe
from decimal import Decimal
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from asgiref.sync import sync_to_async
from api.orders.models import Order
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe with secret key from environment
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')


@csrf_exempt
@require_http_methods(["POST"])
async def create_payment_intent(request):
    """
    Async endpoint to create a Stripe payment intent for an order.
    Mobile app calls this before showing the payment sheet.
    Wrapped with sync_to_async to prevent blocking the ASGI event loop.
    """
    try:
        data = json.loads(request.body)
        order_id = data.get('order_id')
        
        if not order_id:
            return JsonResponse({
                'success': False,
                'error': 'order_id is required'
            }, status=400)
        
        @sync_to_async
        def process_payment_intent():
            # Get order
            order = Order.objects.get(id=order_id)
            
            # Convert total amount to cents (Stripe uses smallest currency unit)
            # PHP (Philippine Peso) smallest unit is centavos (1/100)
            amount_cents = int(float(order.total_amount) * 100)
            
            # Create or retrieve payment intent
            payment_intent = None
            if order.stripe_payment_intent_id:
                # Update existing payment intent
                try:
                    payment_intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
                    
                    # Update amount if changed
                    if payment_intent.amount != amount_cents:
                        payment_intent = stripe.PaymentIntent.modify(
                            order.stripe_payment_intent_id,
                            amount=amount_cents,
                        )
                        logger.info(f"💳 Updated payment intent {order.stripe_payment_intent_id} amount to ₱{order.total_amount}")
                    
                except stripe.error.InvalidRequestError:
                    # Payment intent doesn't exist, create new one
                    order.stripe_payment_intent_id = None
                    payment_intent = None
            
            if not order.stripe_payment_intent_id:
                # Create new payment intent
                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_cents,
                    currency='php',
                    metadata={
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'customer_id': order.customer.id,
                    },
                    description=f'PharmGo Order {order.order_number}',
                )
                
                # Save payment intent ID to order
                order.stripe_payment_intent_id = payment_intent.id
                order.stripe_payment_status = payment_intent.status
                order.save(update_fields=['stripe_payment_intent_id', 'stripe_payment_status'])
                
                logger.info(f"💳 Created payment intent {payment_intent.id} for order {order.order_number}: ₱{order.total_amount}")
            
            return {
                'payment_intent_id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'amount': float(order.total_amount),
                'currency': 'php',
            }
        
        payment_data = await process_payment_intent()
        
        return JsonResponse({
            'success': True,
            'data': payment_data
        })
        
    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Order not found'
        }, status=404)
    
    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Payment processing error: {str(e)}'
        }, status=400)
    
    except Exception as e:
        logger.error(f"❌ Error creating payment intent: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to create payment intent',
            'message': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def stripe_webhook(request):
    """
    Async Stripe webhook handler to prevent blocking the ASGI event loop.
    Handles payment status updates for orders.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        logger.error(f"❌ Invalid webhook payload: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"❌ Invalid webhook signature: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Invalid signature'}, status=400)
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        logger.info(f"💳 Payment succeeded: {payment_intent['id']}")
        
        # Get order from metadata
        order_id = payment_intent['metadata'].get('order_id')
        if order_id:
            @sync_to_async
            def update_order_paid():
                try:
                    order = Order.objects.get(id=int(order_id))
                    order.payment_status = Order.PaymentStatus.PAID
                    order.stripe_payment_status = 'succeeded'
                    order.save(update_fields=['payment_status', 'stripe_payment_status'])
                    logger.info(f"✅ Order {order.order_number} marked as PAID via Stripe")
                    return True
                except Order.DoesNotExist:
                    logger.error(f"❌ Order {order_id} not found for payment intent {payment_intent['id']}")
                    return False
            
            await update_order_paid()
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        logger.warning(f"⚠️ Payment failed: {payment_intent['id']}")
        
        # Get order from metadata
        order_id = payment_intent['metadata'].get('order_id')
        if order_id:
            @sync_to_async
            def update_order_failed():
                try:
                    order = Order.objects.get(id=int(order_id))
                    order.stripe_payment_status = 'failed'
                    order.save(update_fields=['stripe_payment_status'])
                    logger.warning(f"⚠️ Payment failed for order {order.order_number}")
                except Order.DoesNotExist:
                    logger.error(f"❌ Order {order_id} not found for failed payment {payment_intent['id']}")
            
            await update_order_failed()
    
    elif event['type'] == 'payment_intent.canceled':
        payment_intent = event['data']['object']
        logger.info(f"ℹ️ Payment canceled: {payment_intent['id']}")
        
        order_id = payment_intent['metadata'].get('order_id')
        if order_id:
            @sync_to_async
            def update_order_canceled():
                try:
                    order = Order.objects.get(id=int(order_id))
                    order.stripe_payment_status = 'canceled'
                    order.save(update_fields=['stripe_payment_status'])
                except Order.DoesNotExist:
                    pass
            
            await update_order_canceled()
    
    return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(["POST"])
async def confirm_payment(request):
    """
    Async endpoint to confirm payment after successful Stripe payment.
    Called by mobile app after payment sheet completion.
    Wrapped with sync_to_async to prevent blocking the ASGI event loop.
    """
    try:
        data = json.loads(request.body)
        order_id = data.get('order_id')
        payment_intent_id = data.get('payment_intent_id')
        
        if not order_id or not payment_intent_id:
            return JsonResponse({
                'success': False,
                'error': 'order_id and payment_intent_id are required'
            }, status=400)
        
        @sync_to_async
        def verify_and_confirm_payment():
            # Get order
            order = Order.objects.get(id=order_id)
            
            # Verify payment intent with Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status == 'succeeded':
                # Update order payment status
                order.payment_status = Order.PaymentStatus.PAID
                order.stripe_payment_status = 'succeeded'
                order.save(update_fields=['payment_status', 'stripe_payment_status'])
                
                logger.info(f"✅ Payment confirmed for order {order.order_number}")
                
                return {
                    'success': True,
                    'data': {
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'payment_status': order.payment_status,
                        'total_amount': float(order.total_amount),
                    }
                }
            else:
                return {
                    'success': False,
                    'error': f'Payment not completed. Status: {payment_intent.status}',
                    'status_code': 400
                }
        
        result = await verify_and_confirm_payment()
        
        if result.get('success'):
            return JsonResponse(result)
        else:
            status_code = result.pop('status_code', 400)
            return JsonResponse(result, status=status_code)
        
    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Order not found'
        }, status=404)
    
    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error during confirmation: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Payment verification error: {str(e)}'
        }, status=400)
    
    except Exception as e:
        logger.error(f"❌ Error confirming payment: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to confirm payment',
            'message': str(e)
        }, status=500)

