async def direct_pharmacy_sales_report(request, pharmacy_id):
    try:
        from api.users.models import Pharmacy
        from api.orders.models import Order, OrderLine
        from channels.db import database_sync_to_async
        from django.db.models import Sum, Count, F, DecimalField
        from django.db.models.functions import Coalesce
        from decimal import Decimal

        @database_sync_to_async
        def gather_sales():
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            base_orders = (
                Order.objects.filter(
                    order_lines__inventory_item__pharmacy=pharmacy,
                    order_status='delivered'
                )
                .select_related('customer__user')
                .prefetch_related('order_lines__inventory_item__category')
                .distinct()
            )

            total_orders = base_orders.count()
            total_revenue = base_orders.aggregate(
                total=Coalesce(Sum('total_amount'), Decimal('0.00'))
            )['total']

            total_discount = base_orders.aggregate(
                total=Coalesce(Sum('discount_amount'), Decimal('0.00'))
            )['total']

            total_tax = base_orders.aggregate(
                total=Coalesce(Sum('tax_amount'), Decimal('0.00'))
            )['total']

            total_delivery = base_orders.aggregate(
                total=Coalesce(Sum('delivery_fee'), Decimal('0.00'))
            )['total']

            avg_order_value = Decimal('0.00')
            if total_orders:
                avg_order_value = (total_revenue or Decimal('0.00')) / Decimal(total_orders)

            top_customers = list(
                base_orders.values('customer__first_name', 'customer__last_name')
                .annotate(
                    order_count=Count('id'),
                    total_spent=Coalesce(Sum('total_amount'), Decimal('0.00'))
                )
                .order_by('-total_spent')[:10]
            )

            order_lines = (
                OrderLine.objects.filter(
                    order__in=base_orders,
                    inventory_item__pharmacy=pharmacy
                )
                .select_related('inventory_item__category', 'order')
            )

            product_sales = {}
            category_sales = {}
            monthly_sales = {}

            for line in order_lines:
                item_name = getattr(line.inventory_item, 'name', 'Unnamed Product')
                category_name = getattr(getattr(line.inventory_item, 'category', None), 'name', 'Uncategorized')
                month_key = line.order.created_at.strftime('%Y-%m') if line.order and line.order.created_at else 'Unknown'

                quantity = int(getattr(line, 'quantity', 0) or 0)
                total_price = Decimal(getattr(line, 'total_price', Decimal('0.00')) or 0)

                product_entry = product_sales.setdefault(item_name, {
                    'product': item_name,
                    'quantity': 0,
                    'revenue': Decimal('0.00')
                })
                product_entry['quantity'] += quantity
                product_entry['revenue'] += total_price

                category_entry = category_sales.setdefault(category_name, {
                    'category': category_name,
                    'quantity': 0,
                    'revenue': Decimal('0.00')
                })
                category_entry['quantity'] += quantity
                category_entry['revenue'] += total_price

                month_entry = monthly_sales.setdefault(month_key, {
                    'month': month_key,
                    'orders': 0,
                    'revenue': Decimal('0.00')
                })
                month_entry['revenue'] += total_price

            for month_key, entry in monthly_sales.items():
                try:
                    year_str, month_str = month_key.split('-')
                    entry['orders'] = base_orders.filter(
                        created_at__year=int(year_str),
                        created_at__month=int(month_str)
                    ).count()
                except Exception:
                    entry['orders'] = 0

            product_ranking = sorted(product_sales.values(), key=lambda x: x['revenue'], reverse=True)[:15]
            category_ranking = sorted(category_sales.values(), key=lambda x: x['revenue'], reverse=True)
            monthly_breakdown = sorted(monthly_sales.values(), key=lambda x: x['month'])

            detailed_orders = []
            for order in base_orders.order_by('-created_at')[:100]:
                detailed_orders.append({
                    'id': order.id,
                    'order_number': getattr(order, 'order_number', order.id),
                    'total_amount': float(order.total_amount or 0),
                    'subtotal': float(order.subtotal or 0),
                    'discount_amount': float(order.discount_amount or 0),
                    'delivery_fee': float(order.delivery_fee or 0),
                    'created_at': order.created_at.isoformat() if order.created_at else None,
                    'customer': {
                        'first_name': getattr(getattr(order, 'customer', None), 'first_name', ''),
                        'last_name': getattr(getattr(order, 'customer', None), 'last_name', ''),
                    },
                    'items': [
                        {
                            'name': getattr(line.inventory_item, 'name', ''),
                            'quantity': line.quantity,
                            'unit_price': float(line.unit_price or 0),
                            'total_price': float(line.total_price or 0),
                        }
                        for line in order.order_lines.all()
                    ]
                })

            return {
                'summary': {
                    'total_orders': total_orders,
                    'total_revenue': float(total_revenue or 0),
                    'total_discount': float(total_discount or 0),
                    'total_tax': float(total_tax or 0),
                    'total_delivery_fee': float(total_delivery or 0),
                    'average_order_value': float(avg_order_value or 0),
                },
                'top_products': [
                    {
                        'product': entry['product'],
                        'quantity': entry['quantity'],
                        'revenue': float(entry['revenue'])
                    }
                    for entry in product_ranking
                ],
                'top_categories': [
                    {
                        'category': entry['category'],
                        'quantity': entry['quantity'],
                        'revenue': float(entry['revenue'])
                    }
                    for entry in category_ranking
                ],
                'monthly_sales': [
                    {
                        'month': entry['month'],
                        'orders': entry['orders'],
                        'revenue': float(entry['revenue'])
                    }
                    for entry in monthly_breakdown
                ],
                'top_customers': [
                    {
                        'first_name': entry['customer__first_name'],
                        'last_name': entry['customer__last_name'],
                        'orders': entry['order_count'],
                        'total_spent': float(entry['total_spent'])
                    }
                    for entry in top_customers
                ],
                'recent_orders': detailed_orders,
            }

        report = await gather_sales()
        return JsonResponse({'success': True, 'report': report})
    except Exception as e:
        logger.exception('Error generating pharmacy sales report')
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return float(default)


def direct_medicine_categories(request):
    try:
        from api.inventory.models import MedicineCategory

        categories = (
            MedicineCategory.objects.filter(is_active=True)
            .order_by('sort_order', 'name')
            .values('id', 'name')
        )
        return JsonResponse({'success': True, 'categories': list(categories)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


async def direct_medicine_catalog(request):
    try:
        from api.inventory.models import MedicineCatalog
        from django.db.models import Q
        from channels.db import database_sync_to_async

        search_query = (request.GET.get('search') or '').strip()
        form_filter = (request.GET.get('form') or '').strip()
        prescription_required = (request.GET.get('prescription_required') or '').strip().lower()
        limit_str = request.GET.get('limit') or '100'

        try:
            limit = max(1, min(500, int(limit_str)))
        except Exception:
            limit = 100

        @database_sync_to_async
        def fetch_catalog():
            qs = MedicineCatalog.objects.filter(is_active=True, fda_approval=True).select_related('category')
            if search_query:
                qs = qs.filter(
                    Q(name__icontains=search_query)
                    | Q(generic_name__icontains=search_query)
                    | Q(therapeutic_class__icontains=search_query)
                    | Q(description__icontains=search_query)
                )
            if form_filter:
                qs = qs.filter(form=form_filter)
            if prescription_required in ('true', 'false'):
                qs = qs.filter(prescription_required=(prescription_required == 'true'))

            results = []
            for m in qs[:limit]:
                results.append({
                    'id': m.id,
                    'name': m.name,
                    'generic_name': m.generic_name,
                    'form': m.form,
                    'dosage': m.dosage,
                    'description': m.description,
                    'prescription_required': m.prescription_required,
                    'controlled_substance': m.controlled_substance,
                    'therapeutic_class': m.therapeutic_class,
                    'category': {'id': m.category.id, 'name': m.category.name} if m.category_id else None,
                })
            return results

        medicines = await fetch_catalog()
        return JsonResponse({'success': True, 'count': len(medicines), 'medicines': medicines})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


async def direct_pharmacy_inventory(request, pharmacy_id):
    try:
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def fetch_inventory():
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            items = (
                PharmacyInventory.objects.filter(pharmacy=pharmacy)
                .select_related('category')
                .order_by('category__name', 'name')
            )

            categories_map = {}
            total_items = 0
            available_items = 0
            out_of_stock_items = 0
            low_stock_items = 0

            for it in items:
                cat_name = it.category.name if it.category_id else 'Uncategorized'
                categories_map.setdefault(cat_name, [])
                categories_map[cat_name].append({
                    'id': it.id,
                    'name': it.name,
                    'form': it.form,
                    'dosage': it.dosage,
                    'description': it.description,
                    'prescription_required': bool(it.prescription_required),
                    'price': _safe_float(it.price),
                    'original_price': _safe_float(it.original_price or 0),
                    'cost_price': _safe_float(it.cost_price or 0),
                    'is_available': bool(it.is_available),
                    'is_on_sale': bool(it.is_on_sale),
                    'discount_percentage': it.discount_percentage or 0,
                    'expiry_date': it.expiry_date.isoformat() if it.expiry_date else None,
                })
                total_items += 1
                if it.is_available:
                    available_items += 1
                if it.stock_quantity == 0:
                    out_of_stock_items += 1
                elif it.stock_quantity <= it.min_stock_level:
                    low_stock_items += 1

            categories = [{
                'category_name': cat,
                'items': arr,
            } for cat, arr in categories_map.items()]

            return {
                'categories': categories,
                'total_items': total_items,
                'available_items': available_items,
                'out_of_stock_items': out_of_stock_items,
                'low_stock_items': low_stock_items,
            }

        data = await fetch_inventory()

        return JsonResponse({
            'success': True,
            **data,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
async def add_medicines_to_inventory(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.users.models import Pharmacy
        from api.inventory.models import MedicineCatalog, PharmacyInventory, MedicineCategory
        from channels.db import database_sync_to_async

        data = json.loads(request.body or '{}')
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        medicines = data.get('medicines') or []
        if not pharmacy_id or not medicines:
            return JsonResponse({'success': False, 'error': 'pharmacy_id and medicines are required'}, status=400)

        @database_sync_to_async
        def process_inventory():
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)

            added = []
            skipped = []
            for m in medicines:
                mid = m.get('id')
                try:
                    mc = MedicineCatalog.objects.select_related('category').get(id=int(mid))
                    pricing = m.get('pricing') or {}
                    inv, created = PharmacyInventory.objects.get_or_create(
                        pharmacy=pharmacy,
                        medicine=mc,
                        defaults={
                            'category': mc.category,
                            'name': mc.name,
                            'form': mc.form,
                            'dosage': mc.dosage,
                            'description': mc.description,
                            'prescription_required': mc.prescription_required,
                            'price': _safe_float(pricing.get('price', 0)),
                            'original_price': _safe_float(pricing.get('original_price', pricing.get('price', 0))),
                            'cost_price': _safe_float(pricing.get('cost_price', 0)),
                            'stock_quantity': 1000,  # Set to max stock (availability managed by toggle)
                            'max_stock_level': 1000,
                        }
                    )
                    if not created:
                        # update pricing if provided
                        updated = False
                        if 'price' in pricing:
                            inv.price = _safe_float(pricing['price'], inv.price)
                            updated = True
                        if 'original_price' in pricing:
                            inv.original_price = _safe_float(pricing['original_price'], inv.original_price or 0)
                            updated = True
                        if 'cost_price' in pricing:
                            inv.cost_price = _safe_float(pricing['cost_price'], inv.cost_price or 0)
                            updated = True
                        if updated:
                            inv.save()
                    added.append({
                        'id': inv.id,
                        'name': inv.name,
                        'generic_name': getattr(mc, 'generic_name', None),
                        'form': inv.form,
                        'dosage': inv.dosage,
                        'price': _safe_float(inv.price, 0),
                    })
                except Exception as e:
                    skipped.append({
                        'id': mid,
                        'name': (m.get('name') if isinstance(m, dict) else None) or f"ID {mid}",
                        'reason': str(e),
                    })

            return added, skipped

        added, skipped = await process_inventory()

        return JsonResponse({
            'success': True,
            'total_requested': len(medicines),
            'total_added': len(added),
            'added_medicines': added,
            'skipped_medicines': skipped,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
async def add_custom_products_to_inventory(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory, MedicineCategory
        from channels.db import database_sync_to_async

        data = json.loads(request.body or '{}')
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        products = data.get('custom_products') or []
        if not pharmacy_id or not products:
            return JsonResponse({'success': False, 'error': 'pharmacy_id and custom_products are required'}, status=400)

        @database_sync_to_async
        def process_custom_products():
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)

            added = []
            skipped = []
            for p in products:
                try:
                    # Resolve category by id or name (accept both)
                    cat_input = p.get('category')
                    cat = None
                    if isinstance(cat_input, int):
                        try:
                            cat = MedicineCategory.objects.get(id=cat_input)
                        except MedicineCategory.DoesNotExist:
                            cat = None
                    elif isinstance(cat_input, str) and cat_input.strip():
                        # If numeric string, try ID first; else treat as name
                        if cat_input.isdigit():
                            try:
                                cat = MedicineCategory.objects.get(id=int(cat_input))
                            except MedicineCategory.DoesNotExist:
                                cat = None
                        if cat is None:
                            cat, _ = MedicineCategory.objects.get_or_create(name=cat_input.strip())
                    if cat is None:
                        cat, _ = MedicineCategory.objects.get_or_create(name='Custom Products')
                    inv = PharmacyInventory.objects.create(
                        pharmacy=pharmacy,
                        medicine=None,
                        category=cat,
                        name=p.get('name') or 'Custom Product',
                        form=(p.get('form') or p.get('customForm') or 'tablet'),
                        dosage=p.get('dosage') or '',
                        description=p.get('description') or '',
                        prescription_required=bool(p.get('prescription_required')),
                        price=_safe_float(p.get('price', 0)),
                        original_price=_safe_float(p.get('original_price', p.get('price', 0))),
                        cost_price=_safe_float(p.get('cost_price', 0)),
                        stock_quantity=1000,
                        max_stock_level=1000,
                    )
                    added.append({
                        'id': inv.id,
                        'name': inv.name,
                        'form': inv.form,
                        'dosage': inv.dosage,
                        'price': _safe_float(inv.price, 0),
                    })
                except Exception as e:
                    skipped.append({
                        'name': p.get('name') or 'Custom Product',
                        'reason': str(e),
                    })

            return added, skipped

        added, skipped = await process_custom_products()

        return JsonResponse({
            'success': True,
            'total_requested': len(products),
            'total_added': len(added),
            'added_products': added,
            'skipped_products': skipped,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


async def toggle_inventory_availability(request, pharmacy_id, item_id):
    try:
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def toggle_availability():
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            item = PharmacyInventory.objects.get(id=int(item_id), pharmacy=pharmacy)
            item.is_available = not bool(item.is_available)
            item.save(update_fields=['is_available'])
            return bool(item.is_available)

        is_available = await toggle_availability()
        return JsonResponse({'success': True, 'is_available': is_available, 'message': 'Availability updated'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def update_inventory_item(request, pharmacy_id, item_id):
    try:
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory
        import json

        pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
        item = PharmacyInventory.objects.get(id=int(item_id), pharmacy=pharmacy)

        if request.method == 'GET':
            data = {
                'id': item.id,
                'name': item.name,
                'form': item.form,
                'dosage': item.dosage,
                'description': item.description,
                'prescription_required': bool(item.prescription_required),
                'price': _safe_float(item.price),
                'original_price': _safe_float(item.original_price or 0),
                'cost_price': _safe_float(item.cost_price or 0),
                'is_available': bool(item.is_available),
                'is_featured': bool(item.is_featured),
                'is_on_sale': bool(item.is_on_sale),
                'discount_percentage': item.discount_percentage or 0,
                'expiry_date': item.expiry_date.isoformat() if item.expiry_date else None,
            }
            return JsonResponse({'success': True, 'item': data})

        if request.method == 'POST':
            body = json.loads(request.body or '{}')
            for f in ['name', 'form', 'dosage', 'description']:
                if f in body:
                    setattr(item, f, body[f])
            if 'prescription_required' in body:
                item.prescription_required = bool(body['prescription_required'])
            if 'price' in body:
                item.price = _safe_float(body['price'], item.price)
            if 'original_price' in body:
                item.original_price = _safe_float(body['original_price'], item.original_price or 0)
            if 'cost_price' in body:
                item.cost_price = _safe_float(body['cost_price'], item.cost_price or 0)
            if 'is_available' in body:
                item.is_available = bool(body['is_available'])
            if 'is_featured' in body:
                item.is_featured = bool(body['is_featured'])
            if 'is_on_sale' in body:
                item.is_on_sale = bool(body['is_on_sale'])
            if 'discount_percentage' in body:
                try:
                    item.discount_percentage = int(body['discount_percentage'])
                except Exception:
                    pass
            if 'expiry_date' in body:
                try:
                    from datetime import date
                    item.expiry_date = __import__('datetime').datetime.fromisoformat(body['expiry_date']).date()
                except Exception:
                    item.expiry_date = item.expiry_date
            item.save()
            return JsonResponse({'success': True, 'message': 'Item updated', 'item': {'id': item.id}})

        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


async def direct_pharmacy_orders(request, pharmacy_id):
    try:
        from api.users.models import Pharmacy
        from api.orders.models import Order
        from channels.db import database_sync_to_async
        from django.db.models import Q

        @database_sync_to_async
        def fetch_orders():
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            qs = (
                Order.objects.filter(order_lines__inventory_item__pharmacy=pharmacy)
                .select_related('customer__user')
                .prefetch_related('order_lines')
                .distinct()
            )

            def serialize(order):
                raw_img = getattr(order, 'prescription_image_url', '') or ''
                has_prescription_image = bool(raw_img and str(raw_img).strip())
                has_items = order.order_lines.count() > 0
                is_rx = has_prescription_image or not has_items

                items_list = []
                try:
                    for line in order.order_lines.all():
                        if float(line.total_price) > 0:
                            items_list.append({
                                'id': line.id,
                                'name': line.inventory_item.name,
                                'quantity': line.quantity,
                                'unit_price': float(line.unit_price),
                                'total_price': float(line.total_price),
                                'prescription_required': line.prescription_required
                            })
                except Exception:
                    items_list = []

                senior_id_url = getattr(order, 'senior_citizen_id_image', '') or ''

                return {
                    'id': order.id,
                    'order_number': getattr(order, 'order_number', order.id),
                    'order_status': getattr(order, 'order_status', ''),
                    'payment_method': getattr(order, 'payment_method', 'COD'),
                    'total_amount': _safe_float(getattr(order, 'total_amount', 0)),
                    'subtotal': _safe_float(getattr(order, 'subtotal', 0)),
                    'tax_amount': _safe_float(getattr(order, 'tax_amount', 0)),
                    'delivery_fee': _safe_float(getattr(order, 'delivery_fee', 0)),
                    'discount_amount': _safe_float(getattr(order, 'discount_amount', 0)),
                    'created_at': order.created_at.isoformat() if getattr(order, 'created_at', None) else None,
                    'totalAmount': _safe_float(getattr(order, 'total_amount', 0)),
                    'createdAt': order.created_at.isoformat() if getattr(order, 'created_at', None) else None,
                    'isPrescriptionOrder': is_rx,
                    'prescriptionNotes': getattr(order, 'prescription_notes', ''),
                    'prescriptionImageUrl': raw_img,
                    'customerName': getattr(getattr(order, 'customer', None), 'first_name', '') or '',
                    'customerAddress': '',
                    'riderName': '',
                    'riderPhone': '',
                    'items': items_list,
                    'seniorDiscountRequested': getattr(order, 'senior_discount_requested', False),
                    'seniorCitizenIdImage': senior_id_url,
                    'seniorDiscountStatus': getattr(order, 'senior_discount_status', 'not_requested'),
                }

            pending = [serialize(o) for o in qs.filter(order_status='pending').exclude(Q(notes__contains='[PHARMACY_ARCHIVED]'))[:200]]
            preparing = [serialize(o) for o in qs.filter(order_status__in=['preparing', 'accepted']).exclude(Q(notes__contains='[PHARMACY_ARCHIVED]'))[:200]]
            ready = [serialize(o) for o in qs.filter(order_status='ready_for_pickup').exclude(Q(notes__contains='[PHARMACY_ARCHIVED]'))[:200]]
            delivered = [serialize(o) for o in qs.filter(order_status='delivered').exclude(Q(notes__contains='[PHARMACY_ARCHIVED]'))[:200]]

            return {
                'pending': pending,
                'preparing': preparing,
                'ready': ready,
                'delivered': delivered,
                'totalOrders': qs.count(),
                'pendingOrders': len(pending),
                'preparingOrders': len(preparing),
                'readyOrders': len(ready),
                'deliveredOrders': len(delivered),
            }

        result = await fetch_orders()

        def absolutize(url):
            if not url:
                return url
            if str(url).startswith('http'):
                return url
            try:
                return request.build_absolute_uri(url)
            except Exception:
                return url

        for bucket in ('pending', 'preparing', 'ready', 'delivered'):
            for order in result[bucket]:
                order['prescriptionImageUrl'] = absolutize(order.get('prescriptionImageUrl'))
                order['seniorCitizenIdImage'] = absolutize(order.get('seniorCitizenIdImage'))

        return JsonResponse({
            'success': True,
            'orders': {
                'pending': result['pending'],
                'preparing': result['preparing'],
                'ready': result['ready'],
                'delivered': result['delivered'],
            },
            'totalOrders': result['totalOrders'],
            'pendingOrders': result['pendingOrders'],
            'preparingOrders': result['preparingOrders'],
            'readyOrders': result['readyOrders'],
            'deliveredOrders': result['deliveredOrders'],
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def attach_prescription_items(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.orders.models import Order, OrderLine
        from api.inventory.models import PharmacyInventory
        from django.db.models import Sum, F
        from django.utils import timezone
        from decimal import Decimal

        data = json.loads(request.body or '{}')
        order_id = int(data.get('order_id') or 0)
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        items = data.get('items') or []
        if not order_id or not items:
            return JsonResponse({'success': False, 'error': 'order_id and items are required'}, status=400)

        order = Order.objects.get(id=order_id)
        added = []
        for it in items:
            inv_id = int(it.get('inventory_item_id') or 0)
            qty = int(it.get('quantity') or 1)
            inv = PharmacyInventory.objects.get(id=inv_id)
            unit_price = inv.price if inv.price is not None else Decimal('0.00')
            total_price = (unit_price * Decimal(qty))

            line, created = OrderLine.objects.get_or_create(
                order=order,
                inventory_item=inv,
                defaults={
                    'quantity': qty,
                    'unit_price': unit_price,
                    'total_price': total_price,
                    'prescription_required': bool(getattr(inv, 'prescription_required', False)),
                    'prescription_status': 'pending',
                    'notes': (it.get('notes') or '')[:500] if isinstance(it, dict) else '',
                }
            )
            if not created:
                # Update quantity and recompute totals
                line.quantity = qty
                line.unit_price = unit_price
                line.total_price = total_price
                line.save(update_fields=['quantity', 'unit_price', 'total_price'])
            added.append(line.id)

        # Auto-approve senior discount if requested and pending (same logic as cart orders)
        if order.senior_discount_requested and order.senior_discount_status == 'pending':
            subtotal = order.order_lines.aggregate(
                total=Sum(F('unit_price') * F('quantity'))
            )['total'] or Decimal('0.00')
            
            if subtotal > 0:
                # Calculate 20% discount on subtotal
                discount = subtotal * Decimal('0.20')
                
                # Update order with approved senior discount
                order.senior_discount_status = 'approved'
                order.discount_amount = discount
                order.senior_discount_notes = 'Auto-approved when prescription items were added'
                order.senior_discount_review_date = timezone.now()
                
                logger.info(f"💚 Auto-approved senior discount for prescription order {order.order_number}: ₱{discount}")

        # Recalculate order totals after modifications
        try:
            order.calculate_totals()
        except Exception:
            pass

        return JsonResponse({'success': True, 'added_lines': added})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def prepare_price_quote(request):
    """Recalculate order totals prior to sending price quote to the customer.
    This endpoint is idempotent and safe to call; it recomputes subtotal, tax,
    delivery fee (if already set), and total, then returns the updated numbers.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.orders.models import Order
        payload = json.loads(request.body or '{}')
        order_id = int(payload.get('order_id') or 0)
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        order = Order.objects.get(id=order_id)
        totals = order.calculate_totals()
        # Normalize numbers for JSON safety
        def _num(x):
            try:
                return float(x)
            except Exception:
                return 0.0
        return JsonResponse({
            'success': True,
            'data': {
                'subtotal': _num(totals.get('subtotal')),
                'tax_amount': _num(totals.get('tax_amount')),
                'delivery_fee': _num(totals.get('delivery_fee')),
                'discount_amount': _num(totals.get('discount_amount')),
                'total_amount': _num(totals.get('total')),
            }
        })
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Failed to prepare price quote', 'message': str(e)}, status=500)


@csrf_exempt
async def accept_cart_order(request, order_id):
    """
    Async pharmacy accepts a cart order (non-prescription order with items already priced)
    Auto-approves pending senior discount if applicable
    All DB operations wrapped with sync_to_async to prevent ASGI blocking.
    
    POST /api/accept-cart-order/<order_id>/
    {
        "pharmacy_user_id": 5,
        "notes": "" (optional)
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.orders.models import Order
        from api.users.models import User
        from decimal import Decimal
        from django.utils import timezone
        from django.db import transaction
        from asgiref.sync import sync_to_async
        
        data = json.loads(request.body or '{}')
        pharmacy_user_id = data.get('pharmacy_user_id')
        notes = data.get('notes', '')
        
        @sync_to_async
        def accept_order_in_transaction():
            """Perform all DB operations in a single sync context"""
            try:
                order = Order.objects.select_related('customer').get(id=order_id)
            except Order.DoesNotExist:
                return {'error': 'not_found', 'message': f'Order with ID {order_id} not found'}
            
            # Verify order is pending
            if order.order_status != Order.OrderStatus.PENDING:
                return {'error': 'invalid_status', 'message': f'Order is already {order.order_status}, cannot accept'}
            
            # Get pharmacy user (optional for now)
            pharmacy_user = None
            if pharmacy_user_id:
                try:
                    pharmacy_user = User.objects.get(id=pharmacy_user_id)
                except User.DoesNotExist:
                    pass
            
            # Auto-approve senior discount if pending
            senior_discount_auto_approved = False
            discount_amount = 0
            senior_discount_message = None
            
            with transaction.atomic():
                if order.senior_discount_requested and order.senior_discount_status == 'pending':
                    # Calculate 20% discount on subtotal
                    subtotal = order.subtotal or Decimal('0.00')
                    discount = subtotal * Decimal('0.20')
                    
                    # Update order with approved senior discount
                    order.senior_discount_status = 'approved'
                    order.discount_amount = discount
                    if pharmacy_user:
                        order.senior_discount_reviewed_by = pharmacy_user
                    order.senior_discount_review_date = timezone.now()
                    order.senior_discount_notes = 'Auto-approved when order was accepted'
                    
                    # Recalculate totals (this will also waive service fee)
                    order.calculate_totals()
                    
                    senior_discount_auto_approved = True
                    discount_amount = float(discount)
                    senior_discount_message = f"Your order has been accepted! Your senior citizen discount of ₱{discount_amount:.2f} has been approved. Total: ₱{float(order.total_amount):.2f}"
                    
                    logger.info(f"💚 Auto-approved senior discount for Order #{order.order_number}: ₱{discount}")
                
                # Update order status to accepted
                order.update_status(
                    Order.OrderStatus.ACCEPTED,
                    notes=notes or 'Cart order accepted by pharmacy'
                )
            
            logger.info(f"✅ Cart order accepted: {order.order_number} (ID: {order_id})")
            
            # Extract all model data inside sync context
            return {
                'success': True,
                'order_id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'total_amount': float(order.total_amount),
                'senior_discount_auto_approved': senior_discount_auto_approved,
                'discount_amount': discount_amount,
                'senior_discount_message': senior_discount_message
            }
        
        result = await accept_order_in_transaction()
        
        # Handle errors
        if 'error' in result:
            if result['error'] == 'not_found':
                return JsonResponse({'success': False, 'error': result['message']}, status=404)
            elif result['error'] == 'invalid_status':
                return JsonResponse({'success': False, 'error': result['message']}, status=400)
        
        # Build response
        response_data = {
            'success': True,
            'message': 'Order accepted successfully',
            'order_id': result['order_id'],
            'order_number': result['order_number'],
            'order_status': result['order_status'],
            'total_amount': result['total_amount'],
            'senior_discount_auto_approved': result['senior_discount_auto_approved']
        }
        
        if result['senior_discount_auto_approved']:
            response_data['discount_amount'] = result['discount_amount']
            response_data['senior_discount_message'] = result['senior_discount_message']
        
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        logger.error(f"❌ Error accepting cart order: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': 'Failed to accept cart order',
            'message': str(e)
        }, status=500)


@csrf_exempt
def mark_order_ready(request, order_id):
    """
    Pharmacy marks an order as ready for pickup.
    
    POST /api/mark-order-ready/<order_id>/
    {
        "pharmacy_user_id": 5 (optional)
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.orders.models import Order
        from django.utils import timezone
        
        # Get order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Order {order_id} not found'
            }, status=404)
        
        # Verify order is in accepted status
        if order.order_status != Order.OrderStatus.ACCEPTED:
            return JsonResponse({
                'success': False,
                'error': f'Order is {order.order_status}, must be accepted to mark as ready'
            }, status=400)
        
        # Update order status
        old_status = order.order_status
        order.order_status = Order.OrderStatus.READY_FOR_PICKUP
        order.updated_at = timezone.now()
        order.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Order {order.order_number} marked as ready for pickup',
            'data': {
                'order_id': order.id,
                'order_number': order.order_number,
                'old_status': old_status,
                'new_status': order.order_status,
                'updated_at': order.updated_at.isoformat()
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Failed to mark order as ready: {str(e)}'
        }, status=500)


@csrf_exempt
def mark_order_archived(request, order_id):
    """
    Pharmacy marks a delivered order as archived/viewed (removes from live dashboard).
    
    POST /api/mark-order-archived/<order_id>/
    {
        "pharmacy_user_id": 5 (optional)
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.orders.models import Order
        from django.utils import timezone
        
        # Get order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Order {order_id} not found'
            }, status=404)
        
        # Verify order is delivered
        if order.order_status != Order.OrderStatus.DELIVERED:
            return JsonResponse({
                'success': False,
                'error': f'Order must be delivered to archive (current status: {order.order_status})'
            }, status=400)
        
        # Add archived flag to notes or use a custom field if available
        # For now, we'll use notes field to mark as "viewed by pharmacy"
        if not order.notes:
            order.notes = ''
        if '[PHARMACY_ARCHIVED]' not in order.notes:
            order.notes += '\n[PHARMACY_ARCHIVED]'
        order.updated_at = timezone.now()
        order.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Order {order.order_number} marked as archived',
            'data': {
                'order_id': order.id,
                'order_number': order.order_number,
                'status': order.order_status,
                'archived_at': timezone.now().isoformat()
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Failed to archive order: {str(e)}'
        }, status=500)


@csrf_exempt
async def customer_approve_pricing(request):
    """Customer approves or rejects pricing. Updates order status and echoes totals."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.orders.models import Order
        from asgiref.sync import sync_to_async

        payload = json.loads(request.body or '{}')
        order_id = int(payload.get('order_id') or 0)
        approve = bool(payload.get('approve', True))
        notes = (payload.get('notes') or '').strip()
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        @sync_to_async
        def process_approval():
            order = Order.objects.get(id=order_id)

            # Recalculate totals to be sure
            order.calculate_totals()

            # Update order status based on approval
            if approve:
                order.update_status(Order.OrderStatus.ACCEPTED, notes or 'Customer approved pricing')
            else:
                order.update_status(Order.OrderStatus.PENDING, notes or 'Customer requested changes to pricing')

            return {
                'order_id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'subtotal': float(order.subtotal),
                'tax_amount': float(order.tax_amount),
                'delivery_fee': float(order.delivery_fee),
                'discount_amount': float(order.discount_amount),
                'total_amount': float(order.total_amount),
                'approved': bool(approve)
            }

        data = await process_approval()
        return JsonResponse({'success': True, 'data': data})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Failed to process approval', 'message': str(e)}, status=500)

