from rest_framework import serializers
from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    """Address serializer with GPS coordinates and validation"""
    
    class Meta:
        model = Address
        fields = [
            'id', 'user', 'label', 'street_address', 'city', 'state_province',
            'postal_code', 'country', 'latitude', 'longitude', 'is_default',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        # Ensure at least one address field is provided
        required_fields = ['street_address', 'city', 'postal_code']
        if not any(attrs.get(field) for field in required_fields):
            raise serializers.ValidationError("At least street address, city, or postal code is required")
        
        # Validate GPS coordinates if provided
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        if latitude is not None:
            if not -90 <= latitude <= 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        
        if longitude is not None:
            if not -180 <= longitude <= 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        
        # If both coordinates are provided, ensure they're valid
        if latitude is not None and longitude is not None:
            if latitude == 0 and longitude == 0:
                raise serializers.ValidationError("Invalid GPS coordinates (0,0)")
        
        return attrs
    
    def create(self, validated_data):
        # If this is the first address for the user, make it default
        user = validated_data['user']
        if not Address.objects.filter(user=user, is_active=True).exists():
            validated_data['is_default'] = True
        
        # If this address is set as default, unset other defaults
        if validated_data.get('is_default', False):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # If this address is set as default, unset other defaults
        if validated_data.get('is_default', False):
            Address.objects.filter(user=instance.user, is_default=True).update(is_default=False)
        
        return super().update(instance, validated_data)


class AddressCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new addresses"""
    
    class Meta:
        model = Address
        fields = [
            'label', 'street_address', 'city', 'state_province',
            'postal_code', 'country', 'latitude', 'longitude', 'is_default'
        ]
    
    def validate(self, attrs):
        # Ensure at least one address field is provided
        required_fields = ['street_address', 'city', 'postal_code']
        if not any(attrs.get(field) for field in required_fields):
            raise serializers.ValidationError("At least street address, city, or postal code is required")
        
        # Validate GPS coordinates if provided
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        if latitude is not None:
            if not -90 <= latitude <= 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        
        if longitude is not None:
            if not -180 <= longitude <= 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        
        return attrs


class AddressUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing addresses"""
    
    class Meta:
        model = Address
        fields = [
            'label', 'street_address', 'city', 'state_province',
            'postal_code', 'country', 'latitude', 'longitude', 'is_default'
        ]
    
    def validate(self, attrs):
        # Validate GPS coordinates if provided
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        if latitude is not None:
            if not -90 <= latitude <= 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        
        if longitude is not None:
            if not -180 <= longitude <= 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        
        return attrs


class AddressListSerializer(serializers.ModelSerializer):
    """Simplified address serializer for list views"""
    
    class Meta:
        model = Address
        fields = [
            'id', 'label', 'street_address', 'city', 'state_province',
            'postal_code', 'country', 'is_default', 'is_active'
        ]


class AddressDetailSerializer(serializers.ModelSerializer):
    """Detailed address serializer with full information"""
    
    class Meta:
        model = Address
        fields = [
            'id', 'user', 'label', 'street_address', 'city', 'state_province',
            'postal_code', 'country', 'latitude', 'longitude', 'is_default',
            'is_active', 'created_at', 'updated_at'
        ]


class AddressWithDistanceSerializer(AddressSerializer):
    """Address serializer that includes distance calculations"""
    distance_km = serializers.FloatField(read_only=True)
    distance_miles = serializers.FloatField(read_only=True)
    
    class Meta(AddressSerializer.Meta):
        fields = AddressSerializer.Meta.fields + ['distance_km', 'distance_miles']


class AddressBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk address operations"""
    address_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100
    )
    action = serializers.ChoiceField(choices=['activate', 'deactivate', 'delete'])
    
    def validate_address_ids(self, value):
        # Ensure all address IDs exist and belong to the user
        user = self.context['request'].user
        existing_ids = set(Address.objects.filter(
            id__in=value, 
            user=user
        ).values_list('id', flat=True))
        
        if len(existing_ids) != len(value):
            missing_ids = set(value) - existing_ids
            raise serializers.ValidationError(f"Address IDs not found: {missing_ids}")
        
        return value


class AddressSearchSerializer(serializers.Serializer):
    """Serializer for address search functionality"""
    query = serializers.CharField(max_length=255, required=False)
    city = serializers.CharField(max_length=100, required=False)
    state_province = serializers.CharField(max_length=100, required=False)
    postal_code = serializers.CharField(max_length=20, required=False)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    radius_km = serializers.FloatField(default=10.0, min_value=0.1, max_value=100.0)
    
    def validate(self, attrs):
        # If coordinates are provided, both must be present
        has_lat = 'latitude' in attrs
        has_lng = 'longitude' in attrs
        
        if has_lat != has_lng:
            raise serializers.ValidationError("Both latitude and longitude must be provided together")
        
        # Validate coordinates if provided
        if has_lat and has_lng:
            lat = attrs['latitude']
            lng = attrs['longitude']
            
            if not -90 <= lat <= 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
            
            if not -180 <= lng <= 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        
        return attrs
