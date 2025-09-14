from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.db import transaction
from decimal import Decimal
import json
import logging

from .models import User, Customer, Pharmacy, Rider, UserDocument, ValidID
from ..utils.s3_utils import s3_storage, generate_file_path, validate_file_type, validate_file_size

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """User serializer for general use"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'role', 'status', 'is_email_verified', 'is_phone_verified',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_email_verified', 'is_phone_verified', 'created_at', 'updated_at']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def update(self, instance, validated_data):
        # Handle password update separately
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    phone = serializers.CharField(source='phone_number')  # Map 'phone' to 'phone_number'
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 'first_name',
            'last_name', 'phone', 'role'
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
        
        # Extract the specific parameters that create_user expects
        email = validated_data.pop('email', None)
        phone_number = validated_data.pop('phone_number', None)
        password = validated_data.pop('password', None)
        
        # Pass the remaining fields as extra_fields
        user = User.objects.create_user(
            email=email,
            phone_number=phone_number,
            password=password,
            **validated_data
        )
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
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password')
        
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'middle_name', 'phone', 'date_of_birth', 'gender'
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
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


class CustomerSerializer(serializers.ModelSerializer):
    """Customer profile serializer"""
    
    class Meta:
        model = Customer
        fields = [
            'id', 'user', 'preferred_language', 'marketing_consent',
            'is_identity_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_identity_verified']


class PharmacyRegistrationSerializer(serializers.Serializer):
    """Comprehensive serializer for complete pharmacy registration"""
    
    # User account fields
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20)
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')])
    
    # Pharmacy business fields
    pharmacy_name = serializers.CharField(max_length=255)
    business_permit_number = serializers.CharField(max_length=100)
    business_permit_expiry = serializers.DateField()
    pharmacy_license_number = serializers.CharField(max_length=100)
    pharmacy_license_expiry = serializers.DateField()
    
    # Contact information
    business_phone = serializers.CharField(max_length=20, required=False)
    business_email = serializers.EmailField(required=False)
    
    # Location information
    street_address = serializers.CharField(max_length=255)
    barangay = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=50, default='Iligan City')
    province = serializers.CharField(max_length=50, default='Lanao del Norte')
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    
    # Business operations
    operating_hours = serializers.JSONField(default=dict)
    services_offered = serializers.JSONField(default=list)
    payment_methods_accepted = serializers.JSONField(default=list)
    
    # Document upload status
    owner_primary_id_uploaded = serializers.BooleanField(default=False)
    business_permit_uploaded = serializers.BooleanField(default=False)
    pharmacy_license_uploaded = serializers.BooleanField(default=False)
    storefront_image_uploaded = serializers.BooleanField(default=False)
    
    # File uploads (optional - can be uploaded separately)
    pharmacy_license_file = serializers.FileField(required=False, write_only=True)
    business_permit_file = serializers.FileField(required=False, write_only=True)
    owner_primary_id_file = serializers.FileField(required=False, write_only=True)
    storefront_image_file = serializers.ImageField(required=False, write_only=True)
    
    
    def validate(self, attrs):
        # Debug logging
        logger.info(f"=== SERIALIZER VALIDATION DEBUG ===")
        logger.info(f"Raw attrs keys: {list(attrs.keys())}")
        logger.info(f"business_permit_expiry: '{attrs.get('business_permit_expiry')}' (type: {type(attrs.get('business_permit_expiry'))})")
        logger.info(f"pharmacy_license_expiry: '{attrs.get('pharmacy_license_expiry')}' (type: {type(attrs.get('pharmacy_license_expiry'))})")
        logger.info(f"business_permit_number: '{attrs.get('business_permit_number')}'")
        logger.info(f"pharmacy_license_number: '{attrs.get('pharmacy_license_number')}'")
        logger.info(f"pharmacy_name: '{attrs.get('pharmacy_name')}'")
        logger.info(f"street_address: '{attrs.get('street_address')}'")
        logger.info(f"barangay: '{attrs.get('barangay')}'")
        logger.info(f"=====================================")
        
        # Password confirmation (only if both passwords are provided)
        if attrs.get('password') and attrs.get('password_confirm'):
            if attrs['password'] != attrs['password_confirm']:
                raise serializers.ValidationError("Passwords don't match")
        
        # Username uniqueness (only if username is provided)
        if attrs.get('username'):
            if User.objects.filter(username=attrs['username']).exists():
                raise serializers.ValidationError("Username already exists")
        
        # Email uniqueness
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError("Email already exists")
        
        # Phone number uniqueness
        if User.objects.filter(phone_number=attrs['phone']).exists():
            raise serializers.ValidationError("Phone number already exists")
        
        # Validate required fields are not empty
        required_fields = {
            'pharmacy_name': 'Pharmacy name',
            'business_permit_number': 'Business permit number',
            'business_permit_expiry': 'Business permit expiry date',
            'pharmacy_license_number': 'Pharmacy license number',
            'pharmacy_license_expiry': 'Pharmacy license expiry date',
            'street_address': 'Street address',
            'barangay': 'Barangay'
        }
        
        for field, display_name in required_fields.items():
            value = attrs.get(field)
            if not value or value == '' or value is None:
                raise serializers.ValidationError(f"{display_name} is required")
        
        # Business permit uniqueness
        if Pharmacy.objects.filter(business_permit_number=attrs['business_permit_number']).exists():
            raise serializers.ValidationError("Business permit number already exists")
        
        # Pharmacy license uniqueness
        if Pharmacy.objects.filter(pharmacy_license_number=attrs['pharmacy_license_number']).exists():
            raise serializers.ValidationError("Pharmacy license number already exists")
        
        # Ensure operating_hours has proper structure
        if not attrs.get('operating_hours'):
            attrs['operating_hours'] = {
                'monday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
                'tuesday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
                'wednesday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
                'thursday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
                'friday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
                'saturday': {'is_open': True, 'open_time': '09:00', 'close_time': '18:00'},
                'sunday': {'is_open': False, 'open_time': '09:00', 'close_time': '18:00'}
            }
        
        # Ensure services_offered and payment_methods_accepted are lists
        if not attrs.get('services_offered'):
            attrs['services_offered'] = []
        if not attrs.get('payment_methods_accepted'):
            attrs['payment_methods_accepted'] = []
        
        # Use business contact info if not provided separately
        if not attrs.get('business_phone'):
            attrs['business_phone'] = attrs['phone']
        if not attrs.get('business_email'):
            attrs['business_email'] = attrs['email']
        
        return attrs
    
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
    
    def validate_pharmacy_license_file(self, value):
        """Validate pharmacy license file"""
        if value:
            allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
            if not validate_file_type(value, allowed_types):
                raise serializers.ValidationError("Only PDF, JPG, and PNG files are allowed for pharmacy license")
            if not validate_file_size(value, 10 * 1024 * 1024):  # 10MB
                raise serializers.ValidationError("Pharmacy license file size must be less than 10MB")
        return value
    
    def validate_business_permit_file(self, value):
        """Validate business permit file"""
        if value:
            allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
            if not validate_file_type(value, allowed_types):
                raise serializers.ValidationError("Only PDF, JPG, and PNG files are allowed for business permit")
            if not validate_file_size(value, 10 * 1024 * 1024):  # 10MB
                raise serializers.ValidationError("Business permit file size must be less than 10MB")
        return value
    
    def validate_owner_primary_id_file(self, value):
        """Validate owner primary ID file"""
        if value:
            allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
            if not validate_file_type(value, allowed_types):
                raise serializers.ValidationError("Only PDF, JPG, and PNG files are allowed for owner ID")
            if not validate_file_size(value, 10 * 1024 * 1024):  # 10MB
                raise serializers.ValidationError("Owner ID file size must be less than 10MB")
        return value
    
    def validate_storefront_image_file(self, value):
        """Validate storefront image file"""
        if value:
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if not validate_file_type(value, allowed_types):
                raise serializers.ValidationError("Only JPG and PNG files are allowed for storefront image")
            if not validate_file_size(value, 2 * 1024 * 1024):  # 2MB
                raise serializers.ValidationError("Storefront image file size must be less than 2MB")
        return value
    
    def validate_latitude(self, value):
        """Validate latitude coordinate"""
        if value is not None:
            if not (-90 <= value <= 90):
                raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        return value
    
    def validate_longitude(self, value):
        """Validate longitude coordinate"""
        if value is not None:
            if not (-180 <= value <= 180):
                raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        return value
    
    def upload_file_to_s3(self, file_obj, document_type: str, user_id: int) -> str:
        """Upload file to S3 and return URL"""
        if not file_obj:
            return None
        
        # Generate unique file path
        file_path = generate_file_path(document_type, user_id, file_obj.name)
        
        # Upload to S3
        upload_result = s3_storage.upload_file(
            file_obj=file_obj,
            bucket_name=s3_storage.aws_storage_bucket_name,
            object_key=file_path,
            content_type=file_obj.content_type
        )
        
        if upload_result['success']:
            return upload_result['url']
        else:
            raise serializers.ValidationError(f"File upload failed: {upload_result['error']}")
    
    @transaction.atomic
    def create(self, validated_data):
        """Create both User and Pharmacy records in a single transaction"""
        
        logger.info(f"=== CREATE METHOD DEBUG ===")
        logger.info(f"validated_data keys: {list(validated_data.keys())}")
        logger.info(f"business_permit_expiry in validated_data: '{validated_data.get('business_permit_expiry')}' (type: {type(validated_data.get('business_permit_expiry'))})")
        logger.info(f"pharmacy_license_expiry in validated_data: '{validated_data.get('pharmacy_license_expiry')}' (type: {type(validated_data.get('pharmacy_license_expiry'))})")
        
        # Extract file data before creating user
        file_data = {
            'pharmacy_license_file': validated_data.pop('pharmacy_license_file', None),
            'business_permit_file': validated_data.pop('business_permit_file', None),
            'owner_primary_id_file': validated_data.pop('owner_primary_id_file', None),
            'storefront_image_file': validated_data.pop('storefront_image_file', None),
        }
        
        logger.info(f"After pop file data - business_permit_expiry: '{validated_data.get('business_permit_expiry')}' (type: {type(validated_data.get('business_permit_expiry'))})")
        logger.info(f"After pop file data - pharmacy_license_expiry: '{validated_data.get('pharmacy_license_expiry')}' (type: {type(validated_data.get('pharmacy_license_expiry'))})")
        
        # Extract user data (only fields that exist in User model)
        user_data = {
            'email': validated_data['email'],
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'phone_number': validated_data['phone'],
            'role': User.UserRole.PHARMACY
        }
        
        # Handle username and password (optional for registration)
        if validated_data.get('username'):
            user_data['username'] = validated_data['username']
        else:
            # Generate a temporary username based on email
            user_data['username'] = validated_data['email'].split('@')[0] + '_temp'
        
        if validated_data.get('password') and validated_data['password'].strip():
            user_data['password'] = validated_data['password']
        else:
            # Generate a temporary password (user will be required to change on first login)
            user_data['password'] = 'temp_password_123!'
        
        # Create user
        logger.info(f"=== USER CREATION DEBUG ===")
        logger.info(f"user_data: {user_data}")
        logger.info(f"validated_data still has business_permit_expiry: '{validated_data.get('business_permit_expiry')}' (type: {type(validated_data.get('business_permit_expiry'))})")
        logger.info(f"validated_data still has pharmacy_license_expiry: '{validated_data.get('pharmacy_license_expiry')}' (type: {type(validated_data.get('pharmacy_license_expiry'))})")
        logger.info(f"==========================")
        
        try:
            # Temporarily disable the post_save signal to prevent automatic Pharmacy creation
            from django.db.models.signals import post_save
            from api.users.models import create_user_profile
            
            # Disconnect the signal temporarily
            post_save.disconnect(create_user_profile, sender=User)
            
            user = User.objects.create_user(**user_data)
            logger.info(f"User created successfully: ID {user.id}")
            
            # Reconnect the signal
            post_save.connect(create_user_profile, sender=User)
            
        except Exception as e:
            logger.error(f"Failed to create user: {str(e)}")
            # Make sure to reconnect the signal even if user creation fails
            try:
                post_save.connect(create_user_profile, sender=User)
            except:
                pass
            raise serializers.ValidationError(f"Failed to create user account: {str(e)}")
        
        # Create customer profile (all users get customer profile)
        try:
            Customer.objects.create(user=user)
            logger.info(f"Customer profile created successfully for user {user.id}")
        except Exception as e:
            logger.error(f"Failed to create customer profile: {str(e)}")
            user.delete()
            raise serializers.ValidationError(f"Failed to create customer profile: {str(e)}")
        
        # Upload files to S3 and create UserDocument records
        uploaded_files = {}
        document_mapping = {
            'pharmacy_license_file': ('Pharmacy License', validated_data['pharmacy_license_expiry']),
            'business_permit_file': ('Business Permit', validated_data['business_permit_expiry']),
            'owner_primary_id_file': ('Owner Primary ID', None),  # No expiry for ID
            'storefront_image_file': ('Storefront Image', None),  # No expiry for image
        }
        
        for file_type, file_obj in file_data.items():
            if file_obj:
                file_url = None
                try:
                    file_url = self.upload_file_to_s3(file_obj, file_type.replace('_file', ''), user.id)
                    uploaded_files[file_type] = file_url
                    logger.info(f"Uploaded {file_type} to S3 for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to upload {file_type} for user {user.id}: {str(e)}")
                    # Continue with registration even if file upload fails
                
                # Create UserDocument record regardless of S3 upload success/failure
                document_name, expiry_date = document_mapping[file_type]
                try:
                    valid_id = ValidID.objects.get(name=document_name)
                    UserDocument.objects.create(
                        user=user,
                        id_type=valid_id,
                        document_file=file_obj.name,  # Store original filename
                        file_url=file_url,  # Will be None if S3 upload failed
                        expiry_date=expiry_date,
                        status=UserDocument.DocumentStatus.PENDING
                    )
                    logger.info(f"Created UserDocument for {document_name} for user {user.id} (File: {file_obj.name}, URL: {file_url})")
                except ValidID.DoesNotExist:
                    logger.error(f"ValidID '{document_name}' not found for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to create UserDocument for {document_name}: {str(e)}")
        
        # Extract pharmacy data
        logger.info(f"=== PHARMACY DATA CREATION DEBUG ===")
        logger.info(f"validated_data keys before pharmacy data extraction: {list(validated_data.keys())}")
        logger.info(f"business_permit_expiry from validated_data: '{validated_data.get('business_permit_expiry')}' (type: {type(validated_data.get('business_permit_expiry'))})")
        logger.info(f"pharmacy_license_expiry from validated_data: '{validated_data.get('pharmacy_license_expiry')}' (type: {type(validated_data.get('pharmacy_license_expiry'))})")
        
        pharmacy_data = {
            'user': user,
            'pharmacy_name': validated_data['pharmacy_name'],
            'business_permit_number': validated_data['business_permit_number'],
            'business_permit_expiry': validated_data['business_permit_expiry'],
            'pharmacy_license_number': validated_data['pharmacy_license_number'],
            'pharmacy_license_expiry': validated_data['pharmacy_license_expiry'],
            'owner_first_name': validated_data['first_name'],
            'owner_last_name': validated_data['last_name'],
            'owner_middle_name': validated_data.get('middle_name', ''),
            'owner_date_of_birth': validated_data['date_of_birth'],
            'owner_gender': validated_data['gender'],
            'business_phone': validated_data.get('business_phone', validated_data['phone']),
            'business_email': validated_data.get('business_email', validated_data['email']),
            'street_address': validated_data['street_address'],
            'barangay': validated_data['barangay'],
            'city': validated_data['city'],
            'province': validated_data['province'],
            'postal_code': validated_data.get('postal_code', ''),
            'latitude': validated_data.get('latitude'),
            'longitude': validated_data.get('longitude'),
            'operating_hours': validated_data['operating_hours'],
            'services_offered': validated_data['services_offered'],
            'payment_methods_accepted': validated_data['payment_methods_accepted'],
            'owner_primary_id_uploaded': bool(file_data['owner_primary_id_file']),
            'business_permit_uploaded': bool(file_data['business_permit_file']),
            'pharmacy_license_uploaded': bool(file_data['pharmacy_license_file']),
            'storefront_image_uploaded': bool(file_data['storefront_image_file']),
            'status': Pharmacy.PharmacyStatus.PENDING
        }
        
        # Create pharmacy
        logger.info(f"=== PHARMACY CREATION DEBUG ===")
        logger.info(f"pharmacy_data keys: {list(pharmacy_data.keys())}")
        logger.info(f"business_permit_expiry in pharmacy_data: '{pharmacy_data.get('business_permit_expiry')}' (type: {type(pharmacy_data.get('business_permit_expiry'))})")
        logger.info(f"pharmacy_license_expiry in pharmacy_data: '{pharmacy_data.get('pharmacy_license_expiry')}' (type: {type(pharmacy_data.get('pharmacy_license_expiry'))})")
        logger.info(f"=================================")
        
        try:
            pharmacy = Pharmacy.objects.create(**pharmacy_data)
        except Exception as e:
            logger.error(f"Failed to create pharmacy: {str(e)}")
            # Clean up the created user if pharmacy creation fails
            user.delete()
            raise serializers.ValidationError(f"Failed to create pharmacy profile: {str(e)}")
        
        logger.info(f"Created pharmacy registration: User ID {user.id}, Pharmacy ID {pharmacy.id}")
        logger.info(f"Uploaded files: {list(uploaded_files.keys())}")
        
        return pharmacy


class PharmacySerializer(serializers.ModelSerializer):
    """Pharmacy profile serializer"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Pharmacy
        fields = [
            'id', 'user', 'user_id', 'pharmacy_name', 'business_permit_number',
            'business_permit_expiry', 'pharmacy_license_number', 'pharmacy_license_expiry',
            'owner_first_name', 'owner_last_name', 'owner_middle_name', 'owner_date_of_birth',
            'owner_gender', 'business_phone', 'business_email', 'street_address',
            'barangay', 'city', 'province', 'postal_code', 'latitude', 'longitude',
            'operating_hours', 'services_offered', 'payment_methods_accepted',
            'owner_primary_id_uploaded', 'business_permit_uploaded', 'pharmacy_license_uploaded',
            'storefront_image_uploaded', 'is_fully_verified', 'status', 'admin_notes',
            'verified_by', 'verified_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_fully_verified', 'verified_by', 'verified_at', 'admin_notes',
            'created_at', 'updated_at'
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


class RiderSerializer(serializers.ModelSerializer):
    """Rider profile serializer"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Rider
        fields = [
            'id', 'user', 'user_id', 'license_number', 'license_expiry',
            'vehicle_type', 'vehicle_plate', 'is_available', 'current_latitude',
            'current_longitude', 'is_verified', 'verified_at', 'admin_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified', 'verified_at', 'admin_notes', 'created_at', 'updated_at']


class UserDocumentSerializer(serializers.ModelSerializer):
    """Serializer for user documents"""
    
    class Meta:
        model = UserDocument
        fields = [
            'id', 'user', 'id_type', 'document_file', 'file_url', 'expiry_date',
            'status', 'admin_notes', 'verified_by', 'verified_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'verified_by', 'verified_at', 'created_at', 'updated_at']