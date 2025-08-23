from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import User, Customer, Pharmacy, Rider
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    CustomerSerializer, PharmacySerializer, RiderSerializer,
    UserProfileSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from api.pharmacies.serializers import (
    PharmacyCreateSerializer, PharmacyUpdateSerializer, PharmacyDetailSerializer,
    PharmacyVerificationSerializer
)
from .permissions import IsOwnerOrReadOnly, IsPharmacyOwner, IsRiderOwner


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset with role-based access"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action == 'profile':
            return UserProfileSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """User registration endpoint"""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Create role-specific profile if needed
                    if user.role == User.UserRole.CUSTOMER:
                        Customer.objects.create(user=user)
                    elif user.role == User.UserRole.PHARMACY:
                        Customer.objects.create(user=user)  # All users get customer profile
                    elif user.role == User.UserRole.RIDER:
                        Customer.objects.create(user=user)  # All users get customer profile
                    
                    # Generate tokens
                    refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'message': 'User registered successfully',
                        'user': UserSerializer(user).data,
                        'tokens': {
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                        }
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'error': 'Registration failed',
                    'details': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """User login endpoint"""
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """User logout endpoint"""
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            logout(request)
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Logout failed'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        """Get current user's complete profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """Change user password"""
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'error': 'Current password is incorrect'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'}, 
                          status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password_request(self, request):
        """Request password reset"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            # In a real app, send email with reset link
            # For now, just return success message
            return Response({
                'message': 'Password reset instructions sent to your email'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password_confirm(self, request):
        """Confirm password reset with token"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            # In a real app, validate token and reset password
            # For now, just return success message
            return Response({
                'message': 'Password reset successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get current user information"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class CustomerViewSet(viewsets.ModelViewSet):
    """Customer profile management"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Customer.objects.all()
        return Customer.objects.filter(user=user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_profile(self, request):
        """Get current user's customer profile"""
        try:
            customer = Customer.objects.get(user=request.user)
            serializer = CustomerSerializer(customer)
            return Response(serializer.data)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer profile not found'}, 
                          status=status.HTTP_404_NOT_FOUND)


class PharmacyViewSet(viewsets.ModelViewSet):
    """Pharmacy profile management"""
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacyOwner]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PharmacyCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return PharmacyUpdateSerializer
        elif self.action == 'verification':
            return PharmacyVerificationSerializer
        return PharmacySerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Pharmacy.objects.all()
        elif user.role == User.UserRole.PHARMACY:
            return Pharmacy.objects.filter(user=user)
        return Pharmacy.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_pharmacy(self, request):
        """Get current user's pharmacy profile"""
        try:
            pharmacy = Pharmacy.objects.get(user=request.user)
            serializer = PharmacyDetailSerializer(pharmacy)
            return Response(serializer.data)
        except Pharmacy.DoesNotExist:
            return Response({'error': 'Pharmacy profile not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAdminUser])
    def verification(self, request, pk=None):
        """Admin verification of pharmacy"""
        pharmacy = self.get_object()
        serializer = self.get_serializer(pharmacy, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Pharmacy verification updated'}, 
                          status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RiderViewSet(viewsets.ModelViewSet):
    """Rider profile management"""
    queryset = Rider.objects.all()
    serializer_class = RiderSerializer
    permission_classes = [permissions.IsAuthenticated, IsRiderOwner]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Rider.objects.all()
        elif user.role == User.UserRole.RIDER:
            return Rider.objects.filter(user=user)
        return Rider.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_rider_profile(self, request):
        """Get current user's rider profile"""
        try:
            rider = Rider.objects.get(user=request.user)
            serializer = RiderSerializer(rider)
            return Response(serializer.data)
        except Rider.DoesNotExist:
            return Response({'error': 'Rider profile not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['put'], permission_classes=[permissions.IsAdminUser])
    def verification(self, request, pk=None):
        """Admin verification of rider"""
        rider = self.get_object()
        serializer = self.get_serializer(rider, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Rider verification updated'}, 
                          status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
