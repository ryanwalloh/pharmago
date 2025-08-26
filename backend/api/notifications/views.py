from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django.contrib.contenttypes.models import ContentType
from django_filters.rest_framework import DjangoFilterBackend

from api.core.permissions import IsOwnerOrReadOnly
from .models import Notification
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer, NotificationUpdateSerializer,
    NotificationListSerializer, NotificationDetailSerializer, NotificationBulkUpdateSerializer,
    NotificationFilterSerializer, NotificationStatsSerializer
)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    Provides CRUD operations, filtering, and business logic.
    """
    
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'priority', 'is_read', 'is_sent']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'priority', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter notifications by user."""
        return Notification.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return NotificationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return NotificationUpdateSerializer
        elif self.action == 'list':
            return NotificationListSerializer
        elif self.action == 'retrieve':
            return NotificationDetailSerializer
        elif self.action == 'bulk_update':
            return NotificationBulkUpdateSerializer
        elif self.action == 'filter':
            return NotificationFilterSerializer
        elif self.action == 'stats':
            return NotificationStatsSerializer
        return NotificationSerializer
    
    def perform_create(self, serializer):
        """Set user automatically and handle scheduling."""
        notification = serializer.save(user=self.request.user)
        
        # Handle scheduled notifications
        if notification.scheduled_for:
            # Here you would implement actual scheduling logic
            # For now, we'll just mark it as scheduled
            pass
        
        # Send immediate notifications
        if not notification.scheduled_for:
            notification.send_notification()
    
    def perform_update(self, serializer):
        """Handle update logic."""
        notification = serializer.save()
        
        # Resend if delivery methods changed
        if 'delivery_methods' in serializer.validated_data:
            notification.send_notification()
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({
            'message': 'Notification marked as read',
            'is_read': notification.is_read,
            'read_at': notification.read_at
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Mark notification as unread."""
        notification = self.get_object()
        notification.mark_as_unread()
        
        return Response({
            'message': 'Notification marked as unread',
            'is_read': notification.is_read,
            'read_at': notification.read_at
        })
    
    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        """Send notification immediately."""
        notification = self.get_object()
        
        if not notification.can_be_sent:
            return Response({
                'error': 'Notification cannot be sent'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notification.send_notification()
        
        return Response({
            'message': 'Notification sent successfully',
            'is_sent': notification.is_sent,
            'sent_at': notification.sent_at
        })
    
    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        """Schedule notification for future delivery."""
        notification = self.get_object()
        scheduled_time = request.data.get('scheduled_for')
        
        if not scheduled_time:
            return Response({
                'error': 'Scheduled time is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            scheduled_time = timezone.datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
        except ValueError:
            return Response({
                'error': 'Invalid date format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if scheduled_time <= timezone.now():
            return Response({
                'error': 'Scheduled time must be in the future'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notification.schedule_notification(scheduled_time)
        
        return Response({
            'message': 'Notification scheduled successfully',
            'scheduled_for': notification.scheduled_for
        })
    
    @action(detail=True, methods=['post'])
    def cancel_schedule(self, request, pk=None):
        """Cancel scheduled notification."""
        notification = self.get_object()
        notification.cancel_scheduled_notification()
        
        return Response({
            'message': 'Schedule cancelled successfully',
            'scheduled_for': notification.scheduled_for
        })
    
    @action(detail=True, methods=['post'])
    def extend_expiration(self, request, pk=None):
        """Extend notification expiration time."""
        notification = self.get_object()
        new_expiration = request.data.get('expires_at')
        
        if not new_expiration:
            return Response({
                'error': 'New expiration time is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            new_expiration = timezone.datetime.fromisoformat(new_expiration.replace('Z', '+00:00'))
        except ValueError:
            return Response({
                'error': 'Invalid date format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_expiration <= timezone.now():
            return Response({
                'error': 'Expiration time must be in the future'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notification.extend_expiration(new_expiration)
        
        return Response({
            'message': 'Expiration extended successfully',
            'expires_at': notification.expires_at
        })
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update notifications."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        update_data = {k: v for k, v in serializer.validated_data.items() if k != 'notification_ids'}
        
        # Update notifications
        updated_count = Notification.objects.filter(
            id__in=notification_ids,
            user=request.user
        ).update(**update_data)
        
        return Response({
            'message': f'{updated_count} notifications updated successfully',
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all user notifications as read."""
        updated_count = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} notifications marked as read',
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications."""
        queryset = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def urgent(self, request):
        """Get urgent and high priority notifications."""
        queryset = self.get_queryset().filter(
            priority__in=[Notification.Priority.HIGH, Notification.Priority.URGENT]
        )
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def scheduled(self, request):
        """Get scheduled notifications."""
        queryset = self.get_queryset().filter(
            scheduled_for__isnull=False,
            scheduled_for__gt=timezone.now()
        )
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired notifications."""
        queryset = self.get_queryset().filter(
            expires_at__isnull=False,
            expires_at__lt=timezone.now()
        )
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get notifications by type."""
        notification_type = request.query_params.get('type')
        if not notification_type:
            return Response({
                'error': 'Notification type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(notification_type=notification_type)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_priority(self, request):
        """Get notifications by priority."""
        priority = request.query_params.get('priority')
        if not priority:
            return Response({
                'error': 'Priority is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(priority=priority)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics."""
        queryset = self.get_queryset()
        
        # Basic counts
        total_count = queryset.count()
        unread_count = queryset.filter(is_read=False).count()
        read_count = queryset.filter(is_read=True).count()
        sent_count = queryset.filter(is_sent=True).count()
        failed_count = queryset.filter(is_sent=False, scheduled_for__isnull=True).count()
        
        # Counts by type
        by_type = queryset.values('notification_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Counts by priority
        by_priority = queryset.values('priority').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent activity (last 7 days)
        week_ago = timezone.now() - timezone.timedelta(days=7)
        recent_activity = queryset.filter(
            created_at__gte=week_ago
        ).values('created_at__date').annotate(
            count=Count('id')
        ).order_by('created_at__date')
        
        stats_data = {
            'total_count': total_count,
            'unread_count': unread_count,
            'read_count': read_count,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'by_type': list(by_type),
            'by_priority': list(by_priority),
            'by_date': list(recent_activity),
            'recent_activity': list(recent_activity)
        }
        
        serializer = NotificationStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def filter(self, request):
        """Advanced filtering of notifications."""
        serializer = NotificationFilterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        queryset = self.get_queryset()
        filters = Q()
        
        # Apply filters
        if 'notification_type' in serializer.validated_data:
            filters &= Q(notification_type=serializer.validated_data['notification_type'])
        
        if 'priority' in serializer.validated_data:
            filters &= Q(priority=serializer.validated_data['priority'])
        
        if 'is_read' in serializer.validated_data:
            filters &= Q(is_read=serializer.validated_data['is_read'])
        
        if 'is_sent' in serializer.validated_data:
            filters &= Q(is_sent=serializer.validated_data['is_sent'])
        
        if 'date_from' in serializer.validated_data:
            filters &= Q(created_at__date__gte=serializer.validated_data['date_from'])
        
        if 'date_to' in serializer.validated_data:
            filters &= Q(created_at__date__lte=serializer.validated_data['date_to'])
        
        if 'search' in serializer.validated_data:
            search_term = serializer.validated_data['search']
            filters &= (Q(title__icontains=search_term) | Q(message__icontains=search_term))
        
        queryset = queryset.filter(filters)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = NotificationListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NotificationListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def create_system_notification(self, request):
        """Create a system notification for the current user."""
        title = request.data.get('title')
        message = request.data.get('message')
        priority = request.data.get('priority', 'normal')
        
        if not title or not message:
            return Response({
                'error': 'Title and message are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notification = Notification.create_system_notification(
            user=request.user,
            title=title,
            message=message,
            priority=priority
        )
        
        serializer = NotificationDetailSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def create_order_notification(self, request):
        """Create an order-related notification."""
        from api.orders.models import Order
        
        order_id = request.data.get('order_id')
        status_update = request.data.get('status')
        
        if not order_id or not status_update:
            return Response({
                'error': 'Order ID and status are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        notification = Notification.create_order_notification(
            user=request.user,
            order=order,
            status=status_update
        )
        
        serializer = NotificationDetailSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def create_payment_notification(self, request):
        """Create a payment-related notification."""
        from api.payments.models import Payment
        
        payment_id = request.data.get('payment_id')
        
        if not payment_id:
            return Response({
                'error': 'Payment ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return Response({
                'error': 'Payment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        notification = Notification.create_payment_notification(
            user=request.user,
            payment=payment
        )
        
        serializer = NotificationDetailSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
