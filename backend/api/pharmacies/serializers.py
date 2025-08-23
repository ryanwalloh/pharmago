from rest_framework import serializers
from api.users.models import Pharmacy, User
from api.locations.models import Address


class PharmacyListSerializer(serializers.ModelSerializer):
    """Simplified pharmacy serializer for list views"""
    business_name = serializers.CharField()
    city = serializers.CharField(source='user.addresses.filter(is_default=True).first.city', read_only=True)
    is_verified = serializers.BooleanField()
    rating = serializers.FloatField(read_only=True)
    delivery_radius_km = serializers.IntegerField()
    
    class Meta:
        model = Pharmacy
        fields = [
            'id', 'business_name', 'city', 'is_verified', 'rating',
            'delivery_radius_km', 'minimum_order_amount', 'delivery_fee'
        ]


class PharmacyDetailSerializer(serializers.ModelSerializer):
    """Detailed pharmacy serializer with full information"""
    user = serializers.SerializerMethodField()
    addresses = serializers.SerializerMethodField()
    operating_hours = serializers.JSONField()
    
    class Meta:
        model = Pharmacy
        fields = [
            'id', 'user', 'business_name', 'business_license_number',
            'pharmacy_license_number', 'tax_identification_number',
            'business_documents', 'operating_hours', 'is_verified',
            'verification_date', 'verification_notes', 'delivery_radius_km',
            'minimum_order_amount', 'delivery_fee', 'service_fee_percentage',
            'addresses'
        ]
        read_only_fields = ['id', 'is_verified', 'verification_date', 'verification_notes']
    
    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'is_verified': user.is_verified
        }
    
    def get_addresses(self, obj):
        addresses = obj.user.addresses.filter(is_active=True)
        return [
            {
                'id': addr.id,
                'label': addr.label,
                'street_address': addr.street_address,
                'city': addr.city,
                'state_province': addr.state_province,
                'postal_code': addr.postal_code,
                'country': addr.country,
                'latitude': addr.latitude,
                'longitude': addr.longitude,
                'is_default': addr.is_default
            }
            for addr in addresses
        ]


class PharmacyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new pharmacy profiles"""
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Pharmacy
        fields = [
            'user_id', 'business_name', 'business_license_number',
            'pharmacy_license_number', 'tax_identification_number',
            'business_documents', 'operating_hours', 'delivery_radius_km',
            'minimum_order_amount', 'delivery_fee', 'service_fee_percentage'
        ]
    
    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
            if user.role != User.UserRole.PHARMACY:
                raise serializers.ValidationError("Only pharmacy users can create pharmacy profiles")
            if hasattr(user, 'pharmacy'):
                raise serializers.ValidationError("User already has a pharmacy profile")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        return value
    
    def validate_operating_hours(self, value):
        """Validate operating hours JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Operating hours must be a JSON object")
        
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in days:
            if day not in value:
                raise serializers.ValidationError(f"Missing operating hours for {day}")
            
            day_hours = value[day]
            if not isinstance(day_hours, dict):
                raise serializers.ValidationError(f"Invalid format for {day} hours")
            
            if 'is_open' not in day_hours:
                raise serializers.ValidationError(f"Missing 'is_open' for {day}")
            
            if day_hours['is_open']:
                if 'open_time' not in day_hours or 'close_time' not in day_hours:
                    raise serializers.ValidationError(f"Missing open/close times for {day}")
                
                # Validate time format (HH:MM)
                for time_field in ['open_time', 'close_time']:
                    time_value = day_hours[time_field]
                    if not isinstance(time_value, str) or len(time_value) != 5:
                        raise serializers.ValidationError(f"Invalid time format for {day} {time_field}")
                    
                    try:
                        hour, minute = map(int, time_value.split(':'))
                        if not (0 <= hour <= 23 and 0 <= minute <= 59):
                            raise serializers.ValidationError(f"Invalid time values for {day} {time_field}")
                    except ValueError:
                        raise serializers.ValidationError(f"Invalid time format for {day} {time_field}")
        
        return value
    
    def validate_business_documents(self, value):
        """Validate business documents structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Business documents must be a JSON object")
        
        required_docs = ['business_license', 'pharmacy_license', 'tax_id']
        for doc in required_docs:
            if doc not in value:
                raise serializers.ValidationError(f"Missing required document: {doc}")
            
            doc_info = value[doc]
            if not isinstance(doc_info, dict):
                raise serializers.ValidationError(f"Invalid format for {doc}")
            
            if 'file_url' not in doc_info or 'expiry_date' not in doc_info:
                raise serializers.ValidationError(f"Missing file_url or expiry_date for {doc}")
        
        return value


class PharmacyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating pharmacy profiles"""
    
    class Meta:
        model = Pharmacy
        fields = [
            'business_name', 'business_license_number', 'pharmacy_license_number',
            'tax_identification_number', 'business_documents', 'operating_hours',
            'delivery_radius_km', 'minimum_order_amount', 'delivery_fee',
            'service_fee_percentage'
        ]
    
    def validate_operating_hours(self, value):
        """Validate operating hours JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Operating hours must be a JSON object")
        
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in days:
            if day not in value:
                raise serializers.ValidationError(f"Missing operating hours for {day}")
            
            day_hours = value[day]
            if not isinstance(day_hours, dict):
                raise serializers.ValidationError(f"Invalid format for {day} hours")
            
            if 'is_open' not in day_hours:
                raise serializers.ValidationError(f"Missing 'is_open' for {day}")
            
            if day_hours['is_open']:
                if 'open_time' not in day_hours or 'close_time' not in day_hours:
                    raise serializers.ValidationError(f"Missing open/close times for {day}")
        
        return value


class PharmacyVerificationSerializer(serializers.ModelSerializer):
    """Serializer for admin pharmacy verification"""
    verification_notes = serializers.CharField(required=True)
    
    class Meta:
        model = Pharmacy
        fields = ['is_verified', 'verification_notes']
    
    def update(self, instance, validated_data):
        instance.is_verified = validated_data['is_verified']
        instance.verification_notes = validated_data['verification_notes']
        
        if validated_data['is_verified']:
            from django.utils import timezone
            instance.verification_date = timezone.now()
            # Also verify the user account
            instance.user.is_verified = True
            instance.user.save()
        
        instance.save()
        return instance


class PharmacySearchSerializer(serializers.Serializer):
    """Serializer for pharmacy search functionality"""
    query = serializers.CharField(max_length=255, required=False)
    city = serializers.CharField(max_length=100, required=False)
    state_province = serializers.CharField(max_length=100, required=False)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    radius_km = serializers.FloatField(default=10.0, min_value=0.1, max_value=100.0)
    is_verified = serializers.BooleanField(required=False)
    has_delivery = serializers.BooleanField(required=False)
    min_rating = serializers.FloatField(min_value=0.0, max_value=5.0, required=False)
    
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


class PharmacyOperatingHoursSerializer(serializers.ModelSerializer):
    """Serializer for pharmacy operating hours management"""
    operating_hours = serializers.JSONField()
    
    class Meta:
        model = Pharmacy
        fields = ['operating_hours']
    
    def validate_operating_hours(self, value):
        """Validate operating hours JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Operating hours must be a JSON object")
        
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in days:
            if day not in value:
                raise serializers.ValidationError(f"Missing operating hours for {day}")
            
            day_hours = value[day]
            if not isinstance(day_hours, dict):
                raise serializers.ValidationError(f"Invalid format for {day} hours")
            
            if 'is_open' not in day_hours:
                raise serializers.ValidationError(f"Missing 'is_open' for {day}")
            
            if day_hours['is_open']:
                if 'open_time' not in day_hours or 'close_time' not in day_hours:
                    raise serializers.ValidationError(f"Missing open/close times for {day}")
        
        return value


class PharmacyDeliverySettingsSerializer(serializers.ModelSerializer):
    """Serializer for pharmacy delivery settings"""
    
    class Meta:
        model = Pharmacy
        fields = [
            'delivery_radius_km', 'minimum_order_amount', 'delivery_fee',
            'service_fee_percentage'
        ]
    
    def validate_delivery_radius_km(self, value):
        if value < 0.1:
            raise serializers.ValidationError("Delivery radius must be at least 0.1 km")
        if value > 100:
            raise serializers.ValidationError("Delivery radius cannot exceed 100 km")
        return value
    
    def validate_minimum_order_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Minimum order amount cannot be negative")
        return value
    
    def validate_delivery_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Delivery fee cannot be negative")
        return value
    
    def validate_service_fee_percentage(self, value):
        if value < 0:
            raise serializers.ValidationError("Service fee percentage cannot be negative")
        if value > 50:
            raise serializers.ValidationError("Service fee percentage cannot exceed 50%")
        return value
