from rest_framework import serializers
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import Order, OrderLine
from api.inventory.models import PharmacyInventory
from api.users.models import Customer
from api.locations.models import Address


class OrderLineSerializer(serializers.ModelSerializer):
    """Serializer for OrderLine with validation and calculations"""
    
    inventory_item_name = serializers.CharField(source='inventory_item.display_name', read_only=True)
    inventory_item_price = serializers.DecimalField(source='inventory_item.price', read_only=True, max_digits=10, decimal_places=2)
    inventory_item_available = serializers.BooleanField(source='inventory_item.is_available', read_only=True)
    inventory_item_stock = serializers.IntegerField(source='inventory_item.stock_quantity', read_only=True)
    pharmacy_name = serializers.CharField(source='inventory_item.pharmacy.pharmacy_name', read_only=True)
    line_total = serializers.ReadOnlyField()
    product_name = serializers.ReadOnlyField()
    
    class Meta:
        model = OrderLine
        fields = [
            'id', 'order', 'inventory_item', 'inventory_item_name', 'inventory_item_price',
            'inventory_item_available', 'inventory_item_stock', 'pharmacy_name',
            'quantity', 'unit_price', 'total_price', 'prescription_required',
            'prescription_status', 'prescription_notes', 'notes', 'line_total',
            'product_name', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'line_total', 'product_name', 'created_at']
    
    def validate(self, attrs):
        """Validate order line data"""
        inventory_item = attrs.get('inventory_item')
        quantity = attrs.get('quantity', 1)
        
        if not inventory_item:
            raise ValidationError("Inventory item is required")
        
        # Check if inventory item is available
        if not inventory_item.is_available:
            raise ValidationError("Inventory item is not available")
        
        # Check if sufficient stock
        if quantity > inventory_item.stock_quantity:
            raise ValidationError(f"Insufficient stock. Available: {inventory_item.stock_quantity}")
        
        # Check prescription requirement
        if inventory_item.prescription_required and not attrs.get('prescription_status'):
            attrs['prescription_status'] = 'pending'
        
        # Set unit price from inventory if not provided
        if not attrs.get('unit_price'):
            attrs['unit_price'] = inventory_item.current_price
        
        return attrs
    
    def create(self, validated_data):
        """Create order line with calculations"""
        # Calculate total price
        validated_data['total_price'] = validated_data['unit_price'] * validated_data['quantity']
        
        # Update inventory stock
        inventory_item = validated_data['inventory_item']
        inventory_item.update_stock(validated_data['quantity'], 'subtract')
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update order line with stock adjustments"""
        old_quantity = instance.quantity
        new_quantity = validated_data.get('quantity', old_quantity)
        
        # Adjust inventory stock
        if new_quantity != old_quantity:
            inventory_item = instance.inventory_item
            quantity_diff = new_quantity - old_quantity
            
            if quantity_diff > 0:
                # Adding more items
                if quantity_diff > inventory_item.stock_quantity:
                    raise ValidationError(f"Insufficient stock. Available: {inventory_item.stock_quantity}")
                inventory_item.update_stock(quantity_diff, 'subtract')
            else:
                # Reducing items (returning to stock)
                inventory_item.update_stock(abs(quantity_diff), 'add')
        
        # Recalculate total price
        if 'unit_price' in validated_data or 'quantity' in validated_data:
            unit_price = validated_data.get('unit_price', instance.unit_price)
            quantity = validated_data.get('quantity', instance.quantity)
            validated_data['total_price'] = unit_price * quantity
        
        return super().update(instance, validated_data)


class OrderLineCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating order lines during order creation"""
    
    inventory_item_id = serializers.IntegerField(write_only=True)
    quantity = serializers.IntegerField(validators=[MinValueValidator(1)])
    
    class Meta:
        model = OrderLine
        fields = ['inventory_item_id', 'quantity', 'notes']
    
    def validate(self, attrs):
        """Validate order line creation data"""
        inventory_item_id = attrs.get('inventory_item_id')
        quantity = attrs.get('quantity')
        
        try:
            inventory_item = PharmacyInventory.objects.get(id=inventory_item_id)
        except PharmacyInventory.DoesNotExist:
            raise ValidationError("Invalid inventory item")
        
        # Check availability
        if not inventory_item.is_available:
            raise ValidationError("Inventory item is not available")
        
        # Check stock
        if quantity > inventory_item.stock_quantity:
            raise ValidationError(f"Insufficient stock. Available: {inventory_item.stock_quantity}")
        
        # Store inventory item for later use
        attrs['inventory_item'] = inventory_item
        attrs['unit_price'] = inventory_item.current_price
        attrs['prescription_required'] = inventory_item.prescription_required
        
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order with comprehensive order management"""
    
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True)
    delivery_address_full = serializers.CharField(source='delivery_address.full_address', read_only=True)
    order_lines = OrderLineSerializer(many=True, read_only=True)
    order_lines_data = OrderLineCreateSerializer(many=True, write_only=True, required=False)
    order_status_display = serializers.CharField(source='get_order_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    delivery_type_display = serializers.CharField(source='get_delivery_type_display', read_only=True)
    can_be_cancelled = serializers.ReadOnlyField()
    delivery_time_estimate = serializers.ReadOnlyField()
    actual_delivery_time = serializers.ReadOnlyField()
    delivery_tracking = serializers.SerializerMethodField()
    delivery_analytics = serializers.SerializerMethodField()
    order_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_phone',
            'delivery_address', 'delivery_address_full', 'order_status',
            'order_status_display', 'payment_status', 'payment_status_display',
            'delivery_type', 'delivery_type_display', 'subtotal', 'tax_amount',
            'delivery_fee', 'discount_amount', 'total_amount', 'estimated_delivery',
            'actual_delivery', 'delivery_notes', 'preferred_delivery_time',
            'source', 'notes', 'order_lines', 'order_lines_data', 'can_be_cancelled',
            'delivery_time_estimate', 'actual_delivery_time', 'delivery_tracking',
            'delivery_analytics', 'order_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'subtotal', 'tax_amount', 'total_amount',
            'estimated_delivery', 'created_at', 'updated_at'
        ]
    
    def get_delivery_tracking(self, obj):
        """Get delivery tracking information"""
        return obj.get_delivery_tracking()
    
    def get_delivery_analytics(self, obj):
        """Get delivery analytics"""
        return obj.get_delivery_analytics()
    
    def get_order_summary(self, obj):
        """Get order summary"""
        return obj.get_order_summary()
    
    def validate(self, attrs):
        """Validate order data"""
        # Validate delivery address belongs to customer
        customer = attrs.get('customer')
        delivery_address = attrs.get('delivery_address')
        
        if customer and delivery_address:
            if delivery_address.customer != customer:
                raise ValidationError("Delivery address must belong to the customer")
        
        # Validate delivery type and preferred time
        delivery_type = attrs.get('delivery_type', 'standard')
        preferred_time = attrs.get('preferred_delivery_time')
        
        if delivery_type == 'scheduled' and not preferred_time:
            raise ValidationError("Preferred delivery time is required for scheduled delivery")
        
        # Validate order lines data if provided
        order_lines_data = attrs.get('order_lines_data', [])
        if not order_lines_data:
            raise ValidationError("At least one order line is required")
        
        # Check for duplicate inventory items
        inventory_item_ids = [line['inventory_item_id'] for line in order_lines_data]
        if len(inventory_item_ids) != len(set(inventory_item_ids)):
            raise ValidationError("Duplicate inventory items are not allowed")
        
        return attrs
    
    def create(self, validated_data):
        """Create order with order lines and calculations"""
        order_lines_data = validated_data.pop('order_lines_data', [])
        
        with transaction.atomic():
            # Create the order
            order = super().create(validated_data)
            
            # Create order lines
            for line_data in order_lines_data:
                OrderLine.objects.create(
                    order=order,
                    inventory_item=line_data['inventory_item'],
                    quantity=line_data['quantity'],
                    unit_price=line_data['unit_price'],
                    prescription_required=line_data['prescription_required'],
                    notes=line_data.get('notes', '')
                )
            
            # Calculate order totals
            order.calculate_totals()
            
            # Set estimated delivery time
            order.estimated_delivery = order.get_delivery_estimate()
            order.save()
            
            return order
    
    def update(self, instance, validated_data):
        """Update order with business logic"""
        # Handle order status updates
        if 'order_status' in validated_data:
            new_status = validated_data['order_status']
            old_status = instance.order_status
            
            # Validate status transitions
            if not self._is_valid_status_transition(old_status, new_status):
                raise ValidationError(f"Invalid status transition from {old_status} to {new_status}")
            
            # Update delivery time if delivered
            if new_status == 'delivered':
                validated_data['actual_delivery'] = timezone.now()
        
        # Handle payment status updates
        if 'payment_status' in validated_data:
            new_payment_status = validated_data['payment_status']
            if new_payment_status == 'paid' and instance.payment_status != 'paid':
                # Mark as paid and update order status if needed
                if instance.order_status == 'pending':
                    validated_data['order_status'] = 'accepted'
        
        order = super().update(instance, validated_data)
        
        # Recalculate totals if order lines changed
        if 'order_lines' in validated_data:
            order.calculate_totals()
        
        return order
    
    def _is_valid_status_transition(self, old_status, new_status):
        """Check if status transition is valid"""
        valid_transitions = {
            'pending': ['accepted', 'cancelled'],
            'accepted': ['preparing', 'cancelled'],
            'preparing': ['ready_for_pickup', 'cancelled'],
            'ready_for_pickup': ['picked_up', 'cancelled'],
            'picked_up': ['delivered'],
            'delivered': [],  # Final state
            'cancelled': [],  # Final state
            'refunded': []    # Final state
        }
        
        return new_status in valid_transitions.get(old_status, [])


class OrderCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for order creation"""
    
    order_lines_data = OrderLineCreateSerializer(many=True)
    delivery_address_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Order
        fields = [
            'delivery_address_id', 'delivery_type', 'delivery_notes',
            'preferred_delivery_time', 'source', 'notes', 'order_lines_data'
        ]
    
    def validate(self, attrs):
        """Validate order creation data"""
        # Validate delivery address
        delivery_address_id = attrs.get('delivery_address_id')
        customer = self.context['request'].user.customer
        
        try:
            delivery_address = Address.objects.get(id=delivery_address_id, customer=customer)
        except Address.DoesNotExist:
            raise ValidationError("Invalid delivery address")
        
        attrs['delivery_address'] = delivery_address
        attrs['customer'] = customer
        
        return attrs
    
    def create(self, validated_data):
        """Create order with order lines"""
        order_lines_data = validated_data.pop('order_lines_data', [])
        
        with transaction.atomic():
            # Create the order
            order = Order.objects.create(**validated_data)
            
            # Create order lines
            for line_data in order_lines_data:
                OrderLine.objects.create(
                    order=order,
                    inventory_item=line_data['inventory_item'],
                    quantity=line_data['quantity'],
                    unit_price=line_data['unit_price'],
                    prescription_required=line_data['prescription_required'],
                    notes=line_data.get('notes', '')
                )
            
            # Calculate order totals
            order.calculate_totals()
            
            # Set estimated delivery time
            order.estimated_delivery = order.get_delivery_estimate()
            order.save()
            
            return order


class OrderStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating order status"""
    
    new_status = serializers.ChoiceField(choices=Order.OrderStatus.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate status update"""
        new_status = attrs['new_status']
        order = self.context['order']
        
        # Check if status transition is valid
        if not self._is_valid_status_transition(order.order_status, new_status):
            raise ValidationError(f"Invalid status transition from {order.order_status} to {new_status}")
        
        return attrs
    
    def _is_valid_status_transition(self, old_status, new_status):
        """Check if status transition is valid"""
        valid_transitions = {
            'pending': ['accepted', 'cancelled'],
            'accepted': ['preparing', 'cancelled'],
            'preparing': ['ready_for_pickup', 'cancelled'],
            'ready_for_pickup': ['picked_up', 'cancelled'],
            'picked_up': ['delivered'],
            'delivered': [],
            'cancelled': [],
            'refunded': []
        }
        
        return new_status in valid_transitions.get(old_status, [])


class OrderSearchSerializer(serializers.Serializer):
    """Serializer for order search parameters"""
    
    customer_id = serializers.IntegerField(required=False, help_text="Customer ID filter")
    order_status = serializers.ChoiceField(required=False, choices=Order.OrderStatus.choices, help_text="Order status filter")
    payment_status = serializers.ChoiceField(required=False, choices=Order.PaymentStatus.choices, help_text="Payment status filter")
    delivery_type = serializers.ChoiceField(required=False, choices=Order.DeliveryType.choices, help_text="Delivery type filter")
    min_total = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, help_text="Minimum total amount")
    max_total = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, help_text="Maximum total amount")
    date_from = serializers.DateField(required=False, help_text="Orders from date")
    date_to = serializers.DateField(required=False, help_text="Orders to date")
    has_prescription = serializers.BooleanField(required=False, help_text="Orders with prescription items")
    sort_by = serializers.ChoiceField(
        required=False,
        choices=[
            ('created_at', 'Order Date'),
            ('total_amount', 'Total Amount'),
            ('order_number', 'Order Number')
        ],
        default='created_at',
        help_text="Sort order"
    )
    page = serializers.IntegerField(required=False, min_value=1, default=1, help_text="Page number")
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20, help_text="Orders per page")


class OrderStatsSerializer(serializers.Serializer):
    """Serializer for order statistics"""
    
    total_orders = serializers.IntegerField(help_text="Total orders")
    pending_orders = serializers.IntegerField(help_text="Pending orders")
    completed_orders = serializers.IntegerField(help_text="Completed orders")
    cancelled_orders = serializers.IntegerField(help_text="Cancelled orders")
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, help_text="Total revenue")
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, help_text="Average order value")
    orders_today = serializers.IntegerField(help_text="Orders placed today")
    orders_this_week = serializers.IntegerField(help_text="Orders placed this week")
    orders_this_month = serializers.IntegerField(help_text="Orders placed this month")
    status_distribution = serializers.DictField(help_text="Orders per status")
    delivery_type_distribution = serializers.DictField(help_text="Orders per delivery type")
    prescription_orders_count = serializers.IntegerField(help_text="Orders with prescription items")


class PrescriptionVerificationSerializer(serializers.Serializer):
    """Serializer for prescription verification"""
    
    order_line_id = serializers.IntegerField()
    prescription_status = serializers.ChoiceField(choices=[
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ])
    prescription_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate prescription verification"""
        order_line_id = attrs['order_line_id']
        
        try:
            order_line = OrderLine.objects.get(id=order_line_id)
        except OrderLine.DoesNotExist:
            raise ValidationError("Invalid order line")
        
        # Check if prescription is required
        if not order_line.prescription_required:
            raise ValidationError("This item does not require prescription")
        
        # Check if already verified
        if order_line.prescription_status in ['approved', 'rejected']:
            raise ValidationError("Prescription already verified")
        
        attrs['order_line'] = order_line
        return attrs
