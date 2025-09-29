from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


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


def direct_medicine_catalog(request):
    try:
        from django.db.models import Q
        from api.inventory.models import MedicineCatalog

        search_query = (request.GET.get('search') or '').strip()
        form_filter = (request.GET.get('form') or '').strip()
        prescription_required = (request.GET.get('prescription_required') or '').strip().lower()
        limit_str = request.GET.get('limit') or '100'

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

        try:
            limit = max(1, min(500, int(limit_str)))
        except Exception:
            limit = 100

        medicines = []
        for m in qs[:limit]:
            medicines.append({
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
        return JsonResponse({'success': True, 'count': len(medicines), 'medicines': medicines})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def direct_pharmacy_inventory(request, pharmacy_id):
    try:
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory

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

        return JsonResponse({
            'success': True,
            'categories': categories,
            'total_items': total_items,
            'available_items': available_items,
            'out_of_stock_items': out_of_stock_items,
            'low_stock_items': low_stock_items,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def add_medicines_to_inventory(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.users.models import Pharmacy
        from api.inventory.models import MedicineCatalog, PharmacyInventory, MedicineCategory

        data = json.loads(request.body or '{}')
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        medicines = data.get('medicines') or []
        if not pharmacy_id or not medicines:
            return JsonResponse({'success': False, 'error': 'pharmacy_id and medicines are required'}, status=400)

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
def add_custom_products_to_inventory(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory, MedicineCategory

        data = json.loads(request.body or '{}')
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        products = data.get('custom_products') or []
        if not pharmacy_id or not products:
            return JsonResponse({'success': False, 'error': 'pharmacy_id and custom_products are required'}, status=400)

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

        return JsonResponse({
            'success': True,
            'total_requested': len(products),
            'total_added': len(added),
            'added_products': added,
            'skipped_products': skipped,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def toggle_inventory_availability(request, pharmacy_id, item_id):
    try:
        from api.users.models import Pharmacy
        from api.inventory.models import PharmacyInventory

        pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
        item = PharmacyInventory.objects.get(id=int(item_id), pharmacy=pharmacy)
        item.is_available = not bool(item.is_available)
        item.save(update_fields=['is_available'])
        return JsonResponse({'success': True, 'is_available': bool(item.is_available), 'message': 'Availability updated'})
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


def direct_pharmacy_orders(request, pharmacy_id):
    try:
        from api.users.models import Pharmacy
        from api.orders.models import Order

        pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
        qs = (
            Order.objects.filter(order_lines__inventory_item__pharmacy=pharmacy)
            .select_related('customer__user')
            .prefetch_related('order_lines')
            .distinct()
        )
        def serialize(order):
            is_rx = bool(getattr(order, 'prescription_image_url', '') or getattr(order, 'prescription_status', ''))
            raw_img = getattr(order, 'prescription_image_url', '') or ''
            img_url = raw_img
            try:
                if raw_img and not str(raw_img).startswith('http'):
                    img_url = request.build_absolute_uri(raw_img)
            except Exception:
                img_url = raw_img
            return {
                'id': order.id,
                'order_number': getattr(order, 'order_number', order.id),
                'order_status': getattr(order, 'order_status', ''),
                'total_amount': _safe_float(getattr(order, 'total_amount', 0)),
                'created_at': order.created_at.isoformat() if getattr(order, 'created_at', None) else None,
                # Frontend compatibility (camelCase fields used by PharmacyDashboard)
                'totalAmount': _safe_float(getattr(order, 'total_amount', 0)),
                'createdAt': order.created_at.isoformat() if getattr(order, 'created_at', None) else None,
                'isPrescriptionOrder': is_rx,
                'prescriptionNotes': getattr(order, 'prescription_notes', ''),
                'prescriptionImageUrl': img_url,
                'customerName': getattr(getattr(order, 'customer', None), 'first_name', '') or '',
                'customerAddress': '',
                'riderName': '',
                'riderPhone': '',
            }
        pend = [serialize(o) for o in qs.filter(order_status='pending')[:200]]
        prep = [serialize(o) for o in qs.filter(order_status__in=['preparing', 'accepted'])[:200]]
        ready = [serialize(o) for o in qs.filter(order_status='ready_for_pickup')[:200]]
        return JsonResponse({
            'success': True,
            'orders': {
                'pending': pend,
                'preparing': prep,
                'ready': ready,
            },
            'totalOrders': qs.count(),
            'pendingOrders': len(pend),
            'preparingOrders': len(prep),
            'readyOrders': len(ready),
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

        data = json.loads(request.body or '{}')
        order_id = int(data.get('order_id') or 0)
        pharmacy_id = int(data.get('pharmacy_id') or 0)
        items = data.get('items') or []
        if not order_id or not items:
            return JsonResponse({'success': False, 'error': 'order_id and items are required'}, status=400)

        order = Order.objects.get(id=order_id)
        added = []
        from decimal import Decimal
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
def customer_approve_pricing(request):
    """Customer approves or rejects pricing. Updates order status and echoes totals."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        import json
        from api.orders.models import Order
        payload = json.loads(request.body or '{}')
        order_id = int(payload.get('order_id') or 0)
        approve = bool(payload.get('approve', True))
        notes = (payload.get('notes') or '').strip()
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        order = Order.objects.get(id=order_id)
        # Recalculate totals to be sure
        order.calculate_totals()

        # Update order status based on approval
        if approve:
            order.update_status(Order.OrderStatus.ACCEPTED, notes or 'Customer approved pricing')
        else:
            order.update_status(Order.OrderStatus.PENDING, notes or 'Customer requested changes to pricing')

        data = {
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
        return JsonResponse({'success': True, 'data': data})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Failed to process approval', 'message': str(e)}, status=500)

