from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from api.inventory.models import PharmacyInventory
from api.users.models import Pharmacy


@csrf_exempt
@require_http_methods(["GET"])
def search_medicines(request):
    """
    Search for medicines in pharmacy inventories.
    Query parameters:
    - q: search query (required)
    - limit: max results (default: 10)
    
    Returns:
    - List of medicines with pharmacy availability
    """
    try:
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if not query or len(query) < 2:
            return JsonResponse({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }, status=400)
        
        # Search in pharmacy inventory (available items only)
        medicines = PharmacyInventory.objects.filter(
            Q(name__icontains=query) | 
            Q(custom_name__icontains=query) |
            Q(medicine__name__icontains=query) |
            Q(medicine__generic_name__icontains=query),
            is_available=True,
            pharmacy__status='approved'
        ).select_related('pharmacy', 'medicine', 'category').distinct('name', 'dosage', 'form')[:limit]
        
        results = []
        for medicine in medicines:
            # Get count of pharmacies that have this medicine
            pharmacy_count = PharmacyInventory.objects.filter(
                name=medicine.name,
                dosage=medicine.dosage,
                form=medicine.form,
                is_available=True,
                pharmacy__status='approved'
            ).values('pharmacy').distinct().count()
            
            results.append({
                'id': medicine.id,
                'name': medicine.display_name,
                'dosage': medicine.dosage,
                'form': medicine.get_form_display(),
                'category': medicine.category.name if medicine.category else None,
                'prescription_required': medicine.prescription_required,
                'price_range': get_price_range(medicine.name, medicine.dosage, medicine.form),
                'pharmacy_count': pharmacy_count,
                'type': 'medicine'
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def search_pharmacies(request):
    """
    Search for pharmacies by name or location.
    Query parameters:
    - q: search query (required)
    - limit: max results (default: 10)
    
    Returns:
    - List of pharmacies
    """
    try:
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if not query or len(query) < 2:
            return JsonResponse({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }, status=400)
        
        # Search pharmacies by name, address
        pharmacies = Pharmacy.objects.filter(
            Q(pharmacy_name__icontains=query) |
            Q(street_address__icontains=query) |
            Q(barangay__icontains=query) |
            Q(city__icontains=query),
            status='approved'
        ).order_by('pharmacy_name')[:limit]
        
        results = []
        for pharmacy in pharmacies:
            results.append({
                'id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'address': f"{pharmacy.street_address}, {pharmacy.barangay}",
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
                'province': pharmacy.province,
                'latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
                'longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
                'storefront_image': pharmacy.storefront_image_url if hasattr(pharmacy, 'storefront_image_url') else None,
                'type': 'pharmacy'
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_pharmacies_by_medicine(request):
    """
    Get all pharmacies that have a specific medicine in stock.
    Query parameters:
    - medicine_name: medicine name (required)
    - dosage: medicine dosage (required)
    - form: medicine form (required)
    
    Returns:
    - List of pharmacies with pricing
    """
    try:
        medicine_name = request.GET.get('medicine_name', '').strip()
        dosage = request.GET.get('dosage', '').strip()
        form = request.GET.get('form', '').strip()
        
        if not medicine_name or not dosage or not form:
            return JsonResponse({
                'success': False,
                'error': 'medicine_name, dosage, and form are required'
            }, status=400)
        
        # Get all pharmacies that have this medicine
        inventory_items = PharmacyInventory.objects.filter(
            name__iexact=medicine_name,
            dosage__iexact=dosage,
            form=form,
            is_available=True,
            stock_quantity__gt=0,
            pharmacy__status='approved'
        ).select_related('pharmacy').order_by('price')
        
        if not inventory_items.exists():
            return JsonResponse({
                'success': True,
                'data': [],
                'count': 0,
                'message': 'No pharmacies found with this medicine in stock'
            })
        
        results = []
        for item in inventory_items:
            pharmacy = item.pharmacy
            results.append({
                'inventory_id': item.id,
                'pharmacy_id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'address': f"{pharmacy.street_address}, {pharmacy.barangay}",
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
                'province': pharmacy.province,
                'latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
                'longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
                'storefront_image': pharmacy.storefront_image_url if hasattr(pharmacy, 'storefront_image_url') else None,
                'phone': pharmacy.business_phone if pharmacy.business_phone else None,
                'price': float(item.price),
                'original_price': float(item.original_price) if item.original_price else float(item.price),
                'is_on_sale': item.is_on_sale,
                'discount_percentage': item.discount_percentage,
                'stock_quantity': item.stock_quantity,
                'prescription_required': item.prescription_required
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results),
            'medicine': {
                'name': medicine_name,
                'dosage': dosage,
                'form': form
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def get_price_range(medicine_name, dosage, form):
    """Helper function to get price range for a medicine across all pharmacies"""
    try:
        prices = PharmacyInventory.objects.filter(
            name__iexact=medicine_name,
            dosage__iexact=dosage,
            form=form,
            is_available=True,
            pharmacy__status='approved'
        ).values_list('price', flat=True)
        
        if prices:
            return {
                'min': float(min(prices)),
                'max': float(max(prices))
            }
        return None
    except:
        return None

