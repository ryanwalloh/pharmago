from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Customer, Pharmacy, Rider


class UserSerializer(serializers.ModelSerializer):
    """Base user serializer for profile management"""
    password = serializers.CharField(write_only=True, required=False)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone_number',
            'role', 'status', 'is_active', 'is_email_verified', 'is_phone_verified',
            'date_joined', 'last_login', 'password', 'password_confirm'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_email_verified', 'is_phone_verified']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        # Password confirmation validation
        if 'password' in attrs and 'password_confirm' not in attrs:
            raise serializers.ValidationError("Password confirmation is required")
        
        if 'password' in attrs and attrs['password'] != attrs.get('password_confirm'):
            raise serializers.ValidationError("Passwords don't match")
        
        # Email uniqueness validation
        if 'email' in attrs:
            email = attrs['email']
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError("Email already exists")
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', None)
        
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        return user
    
    def update(self, instance, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', None)
        
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        return user


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 'first_name',
            'last_name', 'phone', 'date_of_birth', 'gender', 'role'
        ]
        extra_kwargs = {
            'username': {'required': True},
            'email': {'required': True},
            'password': {'required': True},
            'password_confirm': {'required': True}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            attrs['user'] = user
        else:
            raise serializers.ValidationError("Must include username and password")
        
        return attrs


class CustomerSerializer(serializers.ModelSerializer):
    """Customer profile serializer"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'user', 'user_id', 'first_name', 'last_name', 'middle_name',
            'date_of_birth', 'gender', 'is_senior_citizen', 'senior_citizen_id_number',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship', 'profile_picture', 'is_identity_verified',
            'preferred_payment_method', 'marketing_consent'
        ]
        read_only_fields = ['id', 'is_identity_verified']


class PharmacySerializer(serializers.ModelSerializer):
    """Pharmacy profile serializer"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Pharmacy
        fields = [
            'id', 'user', 'user_id', 'pharmacy_name', 'business_permit_number',
            'pharmacy_license_number', 'operating_hours', 'is_fully_verified',
            'verified_at', 'admin_notes', 'status'
        ]
        read_only_fields = ['id', 'is_fully_verified', 'verified_at', 'admin_notes']
    
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


class RiderSerializer(serializers.ModelSerializer):
    """Rider profile serializer"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Rider
        fields = [
            'id', 'user', 'user_id', 'first_name', 'last_name', 'middle_name',
            'date_of_birth', 'gender', 'vehicle_type', 'vehicle_brand', 'vehicle_model',
            'plate_number', 'vehicle_color', 'emergency_contact_name',
            'emergency_contact_phone', 'emergency_contact_relationship', 'profile_picture',
            'is_fully_verified', 'verified_at', 'admin_notes', 'status',
            'total_deliveries', 'average_rating', 'total_earnings'
        ]
        read_only_fields = ['id', 'is_fully_verified', 'verified_at', 'admin_notes', 
                           'total_deliveries', 'average_rating', 'total_earnings']


class UserProfileSerializer(serializers.ModelSerializer):
    """Comprehensive user profile serializer with related data"""
    customer = CustomerSerializer(read_only=True)
    pharmacy = PharmacySerializer(read_only=True)
    rider = RiderSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone_number',
            'role', 'status', 'is_active', 'is_email_verified', 'is_phone_verified',
            'date_joined', 'last_login', 'customer', 'pharmacy', 'rider'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_email_verified', 'is_phone_verified']


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
