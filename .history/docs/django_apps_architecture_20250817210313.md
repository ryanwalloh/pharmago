# Pharmago Django App Architecture

## Overview

This document outlines the complete Django app architecture for the Pharmago medicine delivery platform. The system is designed with a modular, scalable approach following Django best practices and the database schema defined in `database_schema.md`.

## App Structure

### 1. **Core Apps (Foundation)**

#### **`api.users`** - User Management and Authentication
**Purpose**: Core user authentication, role management, and user profiles
**Responsibilities**:
- Custom User model extending Django's AbstractUser
- User role management (customer, pharmacy, rider, admin)
- Customer profile management with senior citizen features
- User verification and account management

**Key Models**:
- `User`: Custom user model with roles and verification
- `Customer`: Extended customer profile information

**Features**:
- Role-based access control
- Senior citizen discount eligibility
- User verification system
- Profile management

---

#### **`api.locations`** - Address and Location Management
**Purpose**: Customer delivery addresses with GPS coordinates
**Responsibilities**:
- Multiple address management per customer
- GPS coordinate storage and validation
- Address labeling system (home, work, etc.)
- Distance calculations using Haversine formula

**Key Models**:
- `Address`: Customer delivery addresses with coordinates

**Features**:
- GPS coordinate validation
- Distance calculations
- Address labeling system
- Default address management

---

### 2. **Business Logic Apps**

#### **`api.pharmacies`** - Pharmacy Management and Verification
**Purpose**: Pharmacy business information, verification, and management
**Responsibilities**:
- Pharmacy registration and verification
- Business document management
- Operating hours and service configuration
- Location-based pharmacy search

**Key Models**:
- `Pharmacy`: Pharmacy business information and verification

**Features**:
- Multi-step verification process
- Business document management
- Operating hours configuration
- Location-based services

---

#### **`api.inventory`** - Medicine Catalog and Pharmacy Inventory
**Purpose**: Master medicine catalog and pharmacy-specific inventory
**Responsibilities**:
- Pre-defined medicine catalog (FDA-approved medicines)
- Pharmacy inventory management
- Custom product creation
- Stock management and alerts

**Key Models**:
- `MedicineCategory`: Hierarchical medicine categories
- `MedicineCatalog`: Master catalog of all available medicines
- `PharmacyInventory`: Pharmacy's medicine inventory and pricing

**Features**:
- Master medicine catalog
- Custom product creation
- Stock level monitoring
- Price management and discounts
- Expiry date tracking

---

#### **`api.orders`** - Order Management and Processing
**Purpose**: Customer orders, order processing, and delivery coordination
**Responsibilities**:
- Order creation and management
- Order status tracking
- Prescription management
- Order calculations and totals

**Key Models**:
- `Order`: Customer orders and delivery information
- `OrderLine`: Individual items in each order

**Features**:
- Order status workflow
- Prescription verification
- Automatic total calculations
- Delivery time estimation
- Order history tracking

---

#### **`api.delivery`** - Rider Management and Delivery Tracking
**Purpose**: Delivery rider management and real-time tracking
**Responsibilities**:
- Rider registration and verification
- Order assignment and tracking
- Real-time location updates
- Performance metrics and earnings

**Key Models**:
- `Rider`: Delivery rider information and verification
- `RiderAssignment`: Rider assignment and delivery tracking
- `RiderLocation`: Real-time rider location tracking

**Features**:
- Rider verification system
- Real-time GPS tracking
- Order assignment algorithms
- Performance metrics
- Earnings calculation

---

#### **`api.payments`** - Payment Processing and Transactions
**Purpose**: Payment processing, verification, and transaction management
**Responsibilities**:
- Multiple payment method support
- Payment verification and proof
- Refund processing
- Transaction history

**Key Models**:
- `Payment`: Payment transaction records

**Features**:
- Multiple payment methods (COD, GCash, Cards, etc.)
- Payment proof management
- Refund processing
- Transaction tracking
- Fee calculations

---

### 3. **Communication Apps**

#### **`api.notifications`** - System Notifications
**Purpose**: System-wide notification management
**Responsibilities**:
- User notification delivery
- Multiple delivery methods
- Notification scheduling
- Priority-based notifications

**Key Models**:
- `Notification`: System notifications for users

**Features**:
- Multiple notification types
- Priority-based delivery
- Scheduled notifications
- Multiple delivery methods
- Notification expiration

---

#### **`api.chat`** - Order-Related Communication
**Purpose**: Real-time communication for order coordination
**Responsibilities**:
- Chat rooms for order discussions
- Multi-participant conversations
- File and image sharing
- System message integration

**Key Models**:
- `ChatRoom`: Chat rooms for order-related communication
- `ChatParticipant`: Users participating in chat rooms
- `ChatMessage`: Individual messages in chat rooms

**Features**:
- Order-specific chat rooms
- Role-based participation
- File and image sharing
- System message integration
- Message moderation

---

## Database Relationships

### **Core Relationships**
```
User (1) ←→ (1) Customer
User (1) ←→ (1) Pharmacy  
User (1) ←→ (1) Rider

Customer (1) ←→ (N) Address
Customer (1) ←→ (N) Order

Pharmacy (1) ←→ (N) PharmacyInventory
MedicineCatalog (1) ←→ (N) PharmacyInventory
MedicineCategory (1) ←→ (N) MedicineCatalog

Order (1) ←→ (N) OrderLine
Order (1) ←→ (N) Payment
Order (1) ←→ (N) ChatRoom

Rider (1) ←→ (N) RiderAssignment
Rider (1) ←→ (N) RiderLocation

ChatRoom (1) ←→ (N) ChatParticipant
ChatRoom (1) ←→ (N) ChatMessage
```

### **Key Foreign Key Relationships**
- **User-centric**: All user types extend from the base User model
- **Order-centric**: Orders link customers, addresses, and inventory items
- **Location-centric**: GPS coordinates enable distance calculations
- **Communication-centric**: Chat and notifications link to relevant entities

---

## App Dependencies

### **Dependency Flow**
```
api.users (Base)
    ↓
api.locations (depends on users)
    ↓
api.pharmacies (depends on users)
    ↓
api.inventory (depends on pharmacies)
    ↓
api.orders (depends on users, locations, inventory)
    ↓
api.delivery (depends on users, orders)
    ↓
api.payments (depends on orders)
    ↓
api.notifications (depends on users, orders, payments)
    ↓
api.chat (depends on users, orders)
```

---

## Model Design Principles

### **1. Normalization**
- **1NF**: All attributes contain atomic values
- **2NF**: No partial dependencies on composite keys
- **3NF**: No transitive dependencies

### **2. Django Best Practices**
- **Custom User Model**: Extends AbstractUser for flexibility
- **Related Names**: Clear, descriptive related_name attributes
- **Meta Options**: Proper verbose names, ordering, and indexes
- **Constraints**: Database-level validation and constraints

### **3. Performance Optimization**
- **Indexing Strategy**: Strategic indexes on frequently queried fields
- **Select Related**: Optimized queries using select_related and prefetch_related
- **Database Constraints**: Proper foreign key relationships and constraints

### **4. Security Features**
- **Role-based Access**: User roles determine system access
- **Input Validation**: Model-level and form-level validation
- **Audit Trails**: Comprehensive timestamp tracking

---

## API Structure

### **RESTful Endpoints**
Each app provides RESTful API endpoints following Django REST Framework conventions:

```
/api/users/          - User management
/api/locations/      - Address management
/api/pharmacies/     - Pharmacy management
/api/inventory/      - Medicine catalog and inventory
/api/orders/         - Order management
/api/delivery/       - Rider and delivery management
/api/payments/       - Payment processing
/api/notifications/  - Notification management
/api/chat/           - Chat functionality
```

### **Authentication & Permissions**
- **Session Authentication**: For web interface
- **Token Authentication**: For mobile and API access
- **Role-based Permissions**: Granular access control
- **Object-level Permissions**: Entity-specific access rules

---

## Scalability Features

### **1. Horizontal Scaling**
- **Database Sharding**: Can partition by user_id or geographic regions
- **App Separation**: Independent apps can be deployed separately
- **Microservices Ready**: Apps can be extracted to microservices

### **2. Performance Features**
- **Caching Strategy**: Redis-based caching for frequently accessed data
- **Database Optimization**: Proper indexing and query optimization
- **Async Processing**: Celery integration for background tasks

### **3. Monitoring & Logging**
- **Comprehensive Logging**: Structured logging for debugging
- **Performance Metrics**: Query performance and response time monitoring
- **Error Tracking**: Centralized error handling and reporting

---

## Development Workflow

### **1. Model Development**
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### **2. Testing Strategy**
- **Unit Tests**: Model and view testing
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Complete workflow testing

### **3. Code Quality**
- **PEP 8 Compliance**: Python code style adherence
- **Documentation**: Comprehensive docstrings and comments
- **Type Hints**: Python type annotation support

---

## Future Enhancements

### **1. Advanced Features**
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Analytics**: Business intelligence and reporting
- **Machine Learning**: Predictive analytics for inventory and delivery

### **2. Integration Capabilities**
- **Third-party APIs**: Payment gateways, mapping services
- **Mobile Push Notifications**: Firebase integration
- **SMS Integration**: Twilio or similar service integration

### **3. Performance Improvements**
- **Database Optimization**: Query optimization and connection pooling
- **CDN Integration**: Static file delivery optimization
- **Load Balancing**: Horizontal scaling and load distribution

---

## Conclusion

The Pharmago Django app architecture provides a robust, scalable foundation for the medicine delivery platform. The modular design ensures:

- **Maintainability**: Clear separation of concerns
- **Scalability**: Independent app scaling and deployment
- **Security**: Role-based access control and input validation
- **Performance**: Optimized database design and query patterns
- **Flexibility**: Easy to extend and modify individual components

This architecture follows Django best practices and industry standards, making it suitable for both development and production environments.
