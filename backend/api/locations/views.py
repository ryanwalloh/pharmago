from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from math import radians, cos, sin, asin, sqrt

from .models import Address
from .serializers import (
    AddressSerializer, AddressCreateSerializer, AddressUpdateSerializer,
    AddressDetailSerializer, AddressSearchSerializer, AddressBulkUpdateSerializer,
    AddressListSerializer, AddressWithDistanceSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAddressOwner, IsOwnerOrAdmin


class AddressViewSet(viewsets.ModelViewSet):
    """Address management viewset with GPS capabilities"""
    queryset = Address.objects.all()
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AddressCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return AddressUpdateSerializer
        elif self.action == 'list':
            return AddressListSerializer
        elif self.action == 'retrieve':
            return AddressDetailSerializer
        elif self.action == 'search':
            return AddressSearchSerializer
        elif self.action == 'bulk_update':
            return AddressBulkUpdateSerializer
        return AddressSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Address.objects.all()
        return Address.objects.filter(user=user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_addresses(self, request):
        """Get current user's addresses"""
        addresses = self.get_queryset()
        serializer = AddressListSerializer(addresses, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def default_address(self, request):
        """Get current user's default address"""
        try:
            default_address = Address.objects.get(
                user=request.user, 
                is_default=True, 
                is_active=True
            )
            serializer = AddressDetailSerializer(default_address)
            return Response(serializer.data)
        except Address.DoesNotExist:
            return Response({'error': 'No default address found'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def set_default(self, request, pk=None):
        """Set an address as default"""
        address = self.get_object()
        
        # Ensure user owns this address
        if address.user != request.user:
            return Response({'error': 'Not authorized'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Unset other default addresses
        Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
        
        # Set this address as default
        address.is_default = True
        address.save()
        
        serializer = AddressDetailSerializer(address)
        return Response({
            'message': 'Default address updated',
            'address': serializer.data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_update(self, request):
        """Bulk update addresses"""
        serializer = AddressBulkUpdateSerializer(data=request.data)
        if serializer.is_valid():
            address_ids = serializer.validated_data['address_ids']
            action = serializer.validated_data['action']
            
            addresses = Address.objects.filter(
                id__in=address_ids, 
                user=request.user
            )
            
            if action == 'activate':
                addresses.update(is_active=True)
                message = f'{addresses.count()} addresses activated'
            elif action == 'deactivate':
                addresses.update(is_active=False)
                message = f'{addresses.count()} addresses deactivated'
            elif action == 'delete':
                count = addresses.count()
                addresses.delete()
                message = f'{count} addresses deleted'
            
            return Response({'message': message}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def search(self, request):
        """Search addresses with filters"""
        serializer = AddressSearchSerializer(data=request.query_params)
        if serializer.is_valid():
            queryset = self.get_queryset()
            data = serializer.validated_data
            
            # Apply filters
            if data.get('city'):
                queryset = queryset.filter(city__icontains=data['city'])
            
            if data.get('barangay'):
                queryset = queryset.filter(barangay__icontains=data['barangay'])
            
            if data.get('label'):
                queryset = queryset.filter(label=data['label'])
            
            # Apply distance filter if coordinates provided
            if data.get('latitude') and data.get('longitude'):
                user_lat = float(data['latitude'])
                user_lng = float(data['longitude'])
                radius_km = float(data.get('radius_km', 10.0))
                
                # Filter addresses within rough bounding box first (performance optimization)
                lat_range = radius_km / 111.0  # 1 degree ≈ 111 km
                lng_range = radius_km / (111.0 * cos(radians(user_lat)))
                
                queryset = queryset.filter(
                    latitude__range=(user_lat - lat_range, user_lat + lat_range),
                    longitude__range=(user_lng - lng_range, user_lng + lng_range)
                )
                
                # Calculate exact distances and filter by radius
                addresses_with_distance = []
                for address in queryset:
                    if address.latitude and address.longitude:
                        distance = self._calculate_distance(
                            user_lat, user_lng,
                            float(address.latitude), float(address.longitude)
                        )
                        if distance <= radius_km:
                            address.distance = distance
                            addresses_with_distance.append(address)
                
                # Sort by distance
                addresses_with_distance.sort(key=lambda x: x.distance)
                queryset = addresses_with_distance[:queryset.count()]
            
            # Pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = AddressDetailSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = AddressDetailSerializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def nearby(self, request):
        """Find addresses near a location"""
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
        
        # Filter addresses within rough bounding box first (performance optimization)
        lat_range = radius / 111.0  # 1 degree ≈ 111 km
        lng_range = radius / (111.0 * cos(radians(lat)))
        
        queryset = Address.objects.filter(
            latitude__range=(lat - lat_range, lat + lat_range),
            longitude__range=(lng - lng_range, lng + lng_range)
        )
        
        # Calculate exact distances and filter by radius
        addresses_with_distance = []
        for address in queryset:
            if address.latitude and address.longitude:
                distance = self._calculate_distance(
                    lat, lng,
                    float(address.latitude), float(address.longitude)
                )
                if distance <= radius:
                    address.distance = distance
                    addresses_with_distance.append(address)
        
        # Sort by distance
        addresses_with_distance.sort(key=lambda x: x.distance)
        
        # Pagination
        page = self.paginate_queryset(addresses_with_distance)
        if page is not None:
            serializer = AddressDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = AddressDetailSerializer(addresses_with_distance, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def distance_to(self, request, pk=None):
        """Calculate distance from current user to an address"""
        try:
            target_address = self.get_object()
            user_address = Address.objects.filter(
                user=request.user, 
                is_default=True, 
                is_active=True
            ).first()
            
            if not user_address:
                return Response({
                    'error': 'No default address found for user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if not user_address.latitude or not user_address.longitude:
                return Response({
                    'error': 'User address missing GPS coordinates'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not target_address.latitude or not target_address.longitude:
                return Response({
                    'error': 'Target address missing GPS coordinates'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate distance using Haversine formula
            distance_km = user_address.calculate_distance_to(target_address)
            distance_miles = distance_km * 0.621371
            
            return Response({
                'distance_km': round(distance_km, 2),
                'distance_miles': round(distance_miles, 2),
                'from_address': AddressDetailSerializer(user_address).data,
                'to_address': AddressDetailSerializer(target_address).data
            })
            
        except Address.DoesNotExist:
            return Response({
                'error': 'Address not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete address"""
        address = self.get_object()
        address.is_active = False
        address.save()
        
        return Response({
            'message': 'Address deleted successfully'
        }, status=status.HTTP_200_OK)
