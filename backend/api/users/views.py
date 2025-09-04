from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
# from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.views import View
from django.db import transaction
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FileUploadParser
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal

from .models import User, Customer, Pharmacy, Rider, UserDocument, ValidID
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    CustomerSerializer, PharmacySerializer, RiderSerializer,
    UserProfileSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    UserDocumentSerializer
)
from api.pharmacies.serializers import (
    PharmacyCreateSerializer, PharmacyUpdateSerializer, PharmacyDetailSerializer,
    PharmacyVerificationSerializer
)
from .permissions import IsOwnerOrReadOnly, IsPharmacyOwner, IsRiderOwner, IsCustomer


logger = logging.getLogger(__name__)


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
                    # refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'message': 'User registered successfully',
                        'user': UserSerializer(user).data,
                        'tokens': {
                            # 'refresh': str(refresh),
                            # 'access': str(refresh.access_token),
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
            # refresh = RefreshToken.for_user(user)
            
            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    # 'refresh': str(refresh),
                    # 'access': str(refresh.access_token),
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


class DocumentUploadViewSet(ViewSet):
    """ViewSet for handling document uploads during pharmacy registration"""
    
    permission_classes = [AllowAny]  # Allow unauthenticated uploads during registration
    parser_classes = [MultiPartParser, FileUploadParser]
    
    def create(self, request):
        """Upload a document for pharmacy registration"""
        try:
            # Get form data
            document_type = request.data.get('document_type')
            expiry_date = request.data.get('expiry_date')
            file = request.FILES.get('file')
            
            if not document_type or not file:
                return Response({
                    'error': 'Document type and file are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file type
            allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
            if file.content_type not in allowed_types:
                return Response({
                    'error': 'Only PDF, JPG, and PNG files are allowed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size (10MB limit)
            if file.size > 10 * 1024 * 1024:
                return Response({
                    'error': 'File size must be less than 10MB'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate unique filename
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            file_extension = os.path.splitext(file.name)[1]
            filename = f"pharmacy_docs/{document_type}/{timestamp}{file_extension}"
            
            # Save file to storage
            file_path = default_storage.save(filename, ContentFile(file.read()))
            file_url = default_storage.url(file_path)
            
            # Create response data
            response_data = {
                'success': True,
                'file_url': file_url,
                'filename': filename,
                'document_type': document_type,
                'expiry_date': expiry_date,
                'uploaded_at': timezone.now().isoformat()
            }
            
            logger.info(f"Document uploaded successfully: {filename}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Document upload failed: {str(e)}")
            return Response({
                'error': 'Document upload failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def list(self, request):
        """List uploaded documents (for admin review)"""
        try:
            documents = UserDocument.objects.all().order_by('-created_at')
            serializer = UserDocumentSerializer(documents, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Failed to list documents: {str(e)}")
            return Response({
                'error': 'Failed to retrieve documents'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def retrieve(self, request, pk=None):
        """Get specific document details"""
        try:
            document = UserDocument.objects.get(pk=pk)
            serializer = UserDocumentSerializer(document)
            return Response(serializer.data)
        except UserDocument.DoesNotExist:
            return Response({
                'error': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Failed to retrieve document: {str(e)}")
            return Response({
                'error': 'Failed to retrieve document'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
