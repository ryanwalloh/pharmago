from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg
from math import radians, cos, sin, asin, sqrt

from api.users.models import Pharmacy, User
from .serializers import (
    PharmacyListSerializer, PharmacyCreateSerializer, PharmacyUpdateSerializer,
    PharmacyDetailSerializer, PharmacyVerificationSerializer
)
from .permissions import IsPharmacyOwner, IsAdminUser, IsOwnerOrAdmin, IsVerifiedPharmacy, IsPharmacyOrAdmin


class PharmacyViewSet(viewsets.ModelViewSet):
    """Pharmacy management viewset with business features"""
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PharmacyCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return PharmacyUpdateSerializer
        elif self.action == 'list':
            return PharmacyListSerializer
        elif self.action == 'verification':
            return PharmacyVerificationSerializer
        return PharmacyDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Pharmacy.objects.all()
        elif user.role == User.UserRole.PHARMACY:
            return Pharmacy.objects.filter(user=user)
        elif user.role == User.UserRole.CUSTOMER:
            return Pharmacy.objects.none()
        return Pharmacy.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsPharmacyOwner]
        elif self.action == 'verification':
            permission_classes = [permissions.IsAuthenticated, IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_pharmacy(self, request):
        """Get current user's pharmacy profile"""
        if request.user.role != User.UserRole.PHARMACY:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = Pharmacy.objects.get(user=request.user)
            serializer = PharmacyDetailSerializer(pharmacy)
            return Response(serializer.data)
        except Pharmacy.DoesNotExist:
            return Response({'error': 'Pharmacy profile not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAuthenticated, IsAdminUser])
    def verification(self, request, pk=None):
        """Admin verification of pharmacy"""
        pharmacy = self.get_object()
        serializer = self.get_serializer(pharmacy, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Pharmacy verification updated'}, 
                          status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def search(self, request):
        """Search pharmacies with filters"""
        serializer = PharmacySearchSerializer(data=request.query_params)
        if serializer.is_valid():
            queryset = Pharmacy.objects.filter(is_verified=True, is_active=True)
            data = serializer.validated_data
            
            # Text search
            if data.get('query'):
                query = data['query']
                queryset = queryset.filter(
                    Q(business_name__icontains=query) |
                    Q(user__first_name__icontains=query) |
                    Q(user__last_name__icontains=query)
                )
            
            # Location filters
            if data.get('city'):
                queryset = queryset.filter(
                    user__addresses__city__iexact=data['city']
                ).distinct()
            
            if data.get('state_province'):
                queryset = queryset.filter(
                    user__addresses__state_province__iexact=data['state_province']
                ).distinct()
            
            # Geographic search
            if data.get('latitude') and data.get('longitude'):
                lat = data['latitude']
                lng = data['longitude']
                radius = data.get('radius_km', 10.0)
                
                # Create point for distance calculation
                user_location = Point(lng, lat, srid=4326)
                
                # Filter by distance
                queryset = queryset.filter(
                    user__addresses__latitude__range=(lat - radius/111, lat + radius/111),
                    user__addresses__longitude__range=(lng - radius/111, lng + radius/111)
                ).distinct()
                
                # Add distance annotation
                queryset = queryset.annotate(
                    distance=Distance('user__addresses__location', user_location)
                ).filter(distance__lte=D(km=radius))
                
                # Order by distance
                queryset = queryset.order_by('distance')
            
            # Additional filters
            if data.get('is_verified') is not None:
                queryset = queryset.filter(is_verified=data['is_verified'])
            
            if data.get('has_delivery') is not None:
                if data['has_delivery']:
                    queryset = queryset.filter(delivery_radius_km__gt=0)
                else:
                    queryset = queryset.filter(delivery_radius_km=0)
            
            if data.get('min_rating') is not None:
                queryset = queryset.filter(rating__gte=data['min_rating'])
            
            # Pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = PharmacyListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = PharmacyListSerializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def nearby(self, request):
        """Find pharmacies near a location"""
        lat = request.query_params.get('latitude')
        lng = request.query_params.get('longitude')
        radius = float(request.query_params.get('radius_km', 10.0))
        
        if not lat or not lng:
            return Response({'error': 'Latitude and longitude are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response({'error': 'Invalid coordinates'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Filter pharmacies within rough bounding box first (performance optimization)
        lat_range = radius / 111.0  # 1 degree ≈ 111 km
        lng_range = radius / (111.0 * cos(radians(lat)))
        
        nearby_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True, status='approved'
        ).filter(
            latitude__range=(lat - lat_range, lat + lat_range),
            longitude__range=(lng - lng_range, lng + lng_range)
        ).distinct()
        
        # Calculate exact distances and filter by radius
        pharmacies_with_distance = []
        for pharmacy in nearby_pharmacies:
            if pharmacy.latitude and pharmacy.longitude:
                distance = self._calculate_distance(
                    lat, lng,
                    float(pharmacy.latitude), float(pharmacy.longitude)
                )
                if distance <= radius:
                    pharmacy.distance = distance
                    pharmacies_with_distance.append(pharmacy)
        
        # Sort by distance
        pharmacies_with_distance.sort(key=lambda x: x.distance)
        
        # Pagination
        page = self.paginate_queryset(pharmacies_with_distance)
        if page is not None:
            serializer = PharmacyDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PharmacyDetailSerializer(pharmacies_with_distance, many=True)
        return Response(serializer.data)
    
    def _calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two points using Haversine formula"""
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def details(self, request, pk=None):
        """Get detailed pharmacy information"""
        pharmacy = self.get_object()
        serializer = PharmacyDetailSerializer(pharmacy)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAuthenticated, IsPharmacyOwner])
    def operating_hours(self, request, pk=None):
        """Update pharmacy operating hours"""
        pharmacy = self.get_object()
        serializer = self.get_serializer(pharmacy, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Operating hours updated successfully',
                'operating_hours': serializer.data['operating_hours']
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAuthenticated, IsPharmacyOwner])
    def delivery_settings(self, request, pk=None):
        """Update pharmacy delivery settings"""
        pharmacy = self.get_object()
        serializer = self.get_serializer(pharmacy, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Delivery settings updated successfully',
                'delivery_settings': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def verified(self, request):
        """Get list of verified pharmacies"""
        verified_pharmacies = Pharmacy.objects.filter(
            is_verified=True, 
            is_active=True
        ).order_by('business_name')
        
        page = self.paginate_queryset(verified_pharmacies)
        if page is not None:
            serializer = PharmacyListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PharmacyListSerializer(verified_pharmacies, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def pending_verification(self, request):
        """Get list of pharmacies pending verification (admin only)"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        pending_pharmacies = Pharmacy.objects.filter(
            is_verified=False
        ).order_by('user__date_joined')
        
        page = self.paginate_queryset(pending_pharmacies)
        if page is not None:
            serializer = PharmacyDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PharmacyDetailSerializer(pending_pharmacies, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def is_open(self, request, pk=None):
        """Check if pharmacy is currently open"""
        from datetime import datetime
        import pytz
        
        pharmacy = self.get_object()
        now = datetime.now(pytz.UTC)
        current_day = now.strftime('%A').lower()
        
        operating_hours = pharmacy.operating_hours
        if not operating_hours or current_day not in operating_hours:
            return Response({'is_open': False, 'reason': 'No operating hours set'})
        
        day_hours = operating_hours[current_day]
        if not day_hours.get('is_open', False):
            return Response({'is_open': False, 'reason': 'Closed on this day'})
        
        current_time = now.strftime('%H:%M')
        open_time = day_hours.get('open_time')
        close_time = day_hours.get('close_time')
        
        if not open_time or not close_time:
            return Response({'is_open': False, 'reason': 'Invalid operating hours'})
        
        is_open = open_time <= current_time <= close_time
        
        return Response({
            'is_open': is_open,
            'current_time': current_time,
            'open_time': open_time,
            'close_time': close_time,
            'day': current_day
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete pharmacy"""
        pharmacy = self.get_object()
        pharmacy.is_active = False
        pharmacy.save()
        
        return Response({
            'message': 'Pharmacy deleted successfully'
        }, status=status.HTTP_200_OK)
