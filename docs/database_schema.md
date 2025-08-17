# Pharmago Database Schema - Medicine Delivery Platform

## Overview
This document defines the database schema for the Pharmago medicine delivery platform. The schema follows database design best practices with proper normalization, constraints, and indexing for optimal performance.

---

## Table Definitions

### Table 1: User (Django Built-in User Model)
**Purpose**: Core user authentication and role management

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| user_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| role | VARCHAR(50) | NOT NULL, CHECK (role IN ('customer', 'pharmacy', 'rider', 'admin')) | User role in the system |
| username | VARCHAR(150) | NOT NULL, UNIQUE | Unique username for login |
| email | VARCHAR(254) | NOT NULL, UNIQUE | User's email address |
| password | VARCHAR(128) | NOT NULL | Encrypted password hash |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Account activation status |
| date_joined | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation date |
| last_login | TIMESTAMP | NULL | Last login timestamp |

**Indexes**: `idx_user_role`, `idx_user_email`, `idx_user_username`

---

### Table 2: Customer
**Purpose**: Customer profile information and preferences

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| customer_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique customer identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| first_name | VARCHAR(100) | NOT NULL | Customer's first name |
| last_name | VARCHAR(100) | NOT NULL | Customer's last name |
| phone_number | VARCHAR(20) | NOT NULL, UNIQUE | Contact phone number |
| profile_picture | VARCHAR(255) | NULL | Profile picture file path |
| valid_id | VARCHAR(255) | NULL | Government ID file path |
| is_senior | BOOLEAN | NOT NULL, DEFAULT FALSE | Senior citizen status |
| date_of_birth | DATE | NULL | Customer's birth date |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_customer_user`, `idx_customer_phone`, `idx_customer_senior`
**Foreign Keys**: `user_id` → `User(user_id)`

---

### Table 3: Address
**Purpose**: Customer delivery addresses with GPS coordinates

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| address_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique address identifier |
| customer_id | INT | NOT NULL, FOREIGN KEY | Reference to Customer table |
| label | VARCHAR(50) | NOT NULL, CHECK (label IN ('home', 'work', 'parent_house', 'other')) | Address label for identification |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | Marks as default delivery address |
| street_address | TEXT | NOT NULL | Full street address with landmarks |
| barangay | VARCHAR(100) | NOT NULL | Barangay information |
| city | VARCHAR(50) | NOT NULL, DEFAULT 'Iligan City' | City name |
| province | VARCHAR(50) | NOT NULL, DEFAULT 'Lanao del Norte' | Province name |
| postal_code | VARCHAR(10) | NULL | Postal/ZIP code |
| latitude | DECIMAL(10, 8) | NULL | GPS latitude coordinate |
| longitude | DECIMAL(11, 8) | NULL | GPS longitude coordinate |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**: `idx_address_customer`, `idx_address_default`, `idx_address_coordinates`
**Foreign Keys**: `customer_id` → `Customer(customer_id)`

---

### Table 4: Pharmacy
**Purpose**: Pharmacy business information and verification

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| pharmacy_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique pharmacy identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| pharmacy_name | VARCHAR(255) | NOT NULL | Business name |
| first_name | VARCHAR(100) | NOT NULL | Owner's first name |
| last_name | VARCHAR(100) | NOT NULL | Owner's last name |
| phone_number | VARCHAR(20) | NOT NULL | Business contact number |
| email | VARCHAR(254) | NOT NULL | Business email address |
| valid_id | VARCHAR(255) | NOT NULL | Owner's valid ID file path |
| business_permit | VARCHAR(255) | NOT NULL | Business permit file path |
| license_document | VARCHAR(255) | NOT NULL | Pharmacy license file path |
| street_address | VARCHAR(255) | NOT NULL | Business address |
| city | VARCHAR(50) | NOT NULL, DEFAULT 'Iligan City' | City location |
| province | VARCHAR(50) | NOT NULL, DEFAULT 'Lanao del Norte' | Province location |
| latitude | DECIMAL(10, 8) | NULL | GPS latitude coordinate |
| longitude | DECIMAL(11, 8) | NULL | GPS longitude coordinate |
| status | ENUM('pending', 'approved', 'rejected', 'suspended') | NOT NULL, DEFAULT 'pending' | Verification status |
| date_status | TIMESTAMP | NULL | Status change timestamp |
| operating_hours | JSON | NULL | Business operating hours |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_pharmacy_user`, `idx_pharmacy_status`, `idx_pharmacy_location`
**Foreign Keys**: `user_id` → `User(user_id)`

---

### Table 5: MedicineCatalog
**Purpose**: Master catalog of all available medicines (pre-defined dataset)

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| medicine_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique medicine identifier |
| category_id | INT | NOT NULL, FOREIGN KEY | Reference to MedicineCategory table |
| name | VARCHAR(255) | NOT NULL | Medicine name (e.g., "Paracetamol") |
| generic_name | VARCHAR(255) | NULL | Generic/chemical name |
| form | VARCHAR(100) | NOT NULL, CHECK (form IN ('tablet', 'syrup', 'cream', 'injection', 'capsule', 'drops', 'inhaler')) | Medicine form |
| dosage | VARCHAR(100) | NOT NULL | Dosage strength (e.g., "500mg") |
| description | TEXT | NULL | Medicine description and usage |
| prescription_required | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether prescription is required |
| image | VARCHAR(255) | NULL | Default medicine image path |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Medicine availability in catalog |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_medicine_name`, `idx_medicine_category`, `idx_medicine_form`, `idx_medicine_active`
**Foreign Keys**: `category_id` → `MedicineCategory(category_id)`

---

### Table 6: MedicineCategory
**Purpose**: Medicine categories for better organization

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| category_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique category identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE | Category name (e.g., "Pain Relief", "Antibiotics") |
| description | TEXT | NULL | Category description |
| parent_category_id | INT | NULL, FOREIGN KEY | Parent category for subcategories |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Category availability |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**: `idx_category_name`, `idx_category_parent`
**Foreign Keys**: `parent_category_id` → `MedicineCategory(category_id)`

---

### Table 7: PharmacyInventory
**Purpose**: Pharmacy's medicine inventory and pricing

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| inventory_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique inventory record identifier |
| pharmacy_id | INT | NOT NULL, FOREIGN KEY | Reference to Pharmacy table |
| medicine_id | INT | NULL, FOREIGN KEY | Reference to MedicineCatalog (NULL for custom products) |
| category_id | INT | NOT NULL, FOREIGN KEY | Reference to MedicineCategory table |
| name | VARCHAR(255) | NOT NULL | Medicine name (inherited from catalog or custom) |
| form | VARCHAR(100) | NOT NULL | Medicine form |
| dosage | VARCHAR(100) | NOT NULL | Dosage strength |
| description | TEXT | NULL | Medicine description |
| prescription_required | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether prescription is required |
| image | VARCHAR(255) | NULL | Medicine image path |
| price | DECIMAL(10, 2) | NOT NULL, CHECK (price >= 0) | Selling price |
| stock_quantity | INT | NOT NULL, DEFAULT 0, CHECK (stock_quantity >= 0) | Available stock |
| is_available | BOOLEAN | NOT NULL, DEFAULT TRUE | Product availability status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_inventory_pharmacy`, `idx_inventory_medicine`, `idx_inventory_category`, `idx_inventory_available`
**Foreign Keys**: 
- `pharmacy_id` → `Pharmacy(pharmacy_id)`
- `medicine_id` → `MedicineCatalog(medicine_id)`
- `category_id` → `MedicineCategory(category_id)`

---

### Table 8: Rider
**Purpose**: Delivery rider information and verification

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| rider_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique rider identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| first_name | VARCHAR(100) | NOT NULL | Rider's first name |
| last_name | VARCHAR(100) | NOT NULL | Rider's last name |
| email | VARCHAR(254) | NOT NULL | Rider's email address |
| phone_number | VARCHAR(20) | NOT NULL | Contact phone number |
| vehicle_type | ENUM('motorcycle', 'bicycle', 'e_bike', 'car') | NOT NULL | Type of delivery vehicle |
| plate_number | VARCHAR(20) | NULL | Vehicle plate number |
| profile_picture | VARCHAR(255) | NULL | Rider's profile photo |
| valid_id | VARCHAR(255) | NOT NULL | Government ID file path |
| driver_license | VARCHAR(255) | NULL | Driver's license file path |
| status | ENUM('pending', 'approved', 'rejected', 'suspended') | NOT NULL, DEFAULT 'pending' | Verification status |
| date_status | TIMESTAMP | NULL | Status change timestamp |
| current_latitude | DECIMAL(10, 8) | NULL | Current GPS latitude |
| current_longitude | DECIMAL(11, 8) | NULL | Current GPS longitude |
| is_online | BOOLEAN | NOT NULL, DEFAULT FALSE | Online/available status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_rider_user`, `idx_rider_status`, `idx_rider_location`, `idx_rider_online`
**Foreign Keys**: `user_id` → `User(user_id)`

---

### Table 9: Order
**Purpose**: Customer orders and delivery information

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| order_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique order identifier |
| customer_id | INT | NOT NULL, FOREIGN KEY | Reference to Customer table |
| address_id | INT | NOT NULL, FOREIGN KEY | Reference to Address table |
| total_amount | DECIMAL(10, 2) | NOT NULL, CHECK (total_amount >= 0) | Total order amount |
| delivery_fee | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Delivery service fee |
| order_status | ENUM('pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled') | NOT NULL, DEFAULT 'pending' | Current order status |
| payment_status | ENUM('unpaid', 'paid', 'failed', 'refunded') | NOT NULL, DEFAULT 'unpaid' | Payment status |
| delivery_notes | TEXT | NULL | Special delivery instructions |
| estimated_delivery | TIMESTAMP | NULL | Estimated delivery time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_order_customer`, `idx_order_status`, `idx_order_payment_status`, `idx_order_created`
**Foreign Keys**: 
- `customer_id` → `Customer(customer_id)`
- `address_id` → `Address(address_id)`

---

### Table 10: OrderLine
**Purpose**: Individual items in each order

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| order_line_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique order line identifier |
| order_id | INT | NOT NULL, FOREIGN KEY | Reference to Order table |
| inventory_id | INT | NOT NULL, FOREIGN KEY | Reference to PharmacyInventory table |
| quantity | INT | NOT NULL, CHECK (quantity > 0) | Quantity ordered |
| unit_price | DECIMAL(10, 2) | NOT NULL, CHECK (unit_price >= 0) | Price per unit |
| total_price | DECIMAL(10, 2) | NOT NULL, CHECK (total_price >= 0) | Total price for this line |
| notes | TEXT | NULL | Special instructions for this item |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**: `idx_orderline_order`, `idx_orderline_inventory`
**Foreign Keys**: 
- `order_id` → `Order(order_id)`
- `inventory_id` → `PharmacyInventory(inventory_id)`

---

### Table 11: RiderAssignment
**Purpose**: Rider assignment and delivery tracking

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| assignment_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique assignment identifier |
| rider_id | INT | NOT NULL, FOREIGN KEY | Reference to Rider table |
| order_id | INT | NOT NULL, FOREIGN KEY | Reference to Order table |
| rider_fee | DECIMAL(10, 2) | NOT NULL, CHECK (rider_fee >= 0) | Amount paid to rider |
| service_fee | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Platform service fee |
| assigned_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Assignment timestamp |
| picked_up_at | TIMESTAMP | NULL | Pickup timestamp |
| delivered_at | TIMESTAMP | NULL | Delivery completion timestamp |
| proof_of_delivery | VARCHAR(255) | NULL | Delivery proof image path |
| estimated_delivery_at | TIMESTAMP | NULL | Estimated delivery time |
| status | ENUM('pending', 'accepted', 'picked_up', 'delivered', 'cancelled') | NOT NULL, DEFAULT 'pending' | Assignment status |
| delivery_notes | TEXT | NULL | Delivery-related notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_assignment_rider`, `idx_assignment_order`, `idx_assignment_status`
**Foreign Keys**: 
- `rider_id` → `Rider(rider_id)`
- `order_id` → `Order(order_id)`

---

### Table 12: RiderLocation
**Purpose**: Real-time rider location tracking

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| location_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique location record identifier |
| rider_id | INT | NOT NULL, FOREIGN KEY | Reference to Rider table |
| latitude | DECIMAL(10, 8) | NOT NULL | GPS latitude coordinate |
| longitude | DECIMAL(11, 8) | NOT NULL | GPS longitude coordinate |
| speed_kmph | DECIMAL(5, 2) | NULL, CHECK (speed_kmph >= 0) | Current speed in km/h |
| direction | VARCHAR(20) | NULL | Direction (N, S, E, W) or heading angle |
| accuracy | DECIMAL(5, 2) | NULL, CHECK (accuracy >= 0) | GPS accuracy in meters |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Location timestamp |

**Indexes**: `idx_location_rider`, `idx_location_timestamp`, `idx_location_coordinates`
**Foreign Keys**: `rider_id` → `Rider(rider_id)`

---

### Table 13: RiderEarnings
**Purpose**: Rider earnings tracking and calculations

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| earning_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique earning record identifier |
| rider_id | INT | NOT NULL, FOREIGN KEY | Reference to Rider table |
| period_start | DATE | NOT NULL | Earning period start date |
| period_end | DATE | NOT NULL | Earning period end date |
| total_earnings | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00, CHECK (total_earnings >= 0) | Total earnings for period |
| total_deliveries | INT | NOT NULL, DEFAULT 0, CHECK (total_deliveries >= 0) | Number of deliveries completed |
| platform_fee | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Platform fees deducted |
| net_earnings | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Net earnings after fees |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**: `idx_earnings_rider`, `idx_earnings_period`
**Foreign Keys**: `rider_id` → `Rider(rider_id)`

---

### Table 14: Prescription
**Purpose**: Prescription management for medicine orders

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| prescription_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique prescription identifier |
| order_id | INT | NOT NULL, FOREIGN KEY | Reference to Order table |
| image_path | VARCHAR(255) | NOT NULL | Prescription image file path |
| doctor_name | VARCHAR(255) | NULL | Prescribing doctor's name |
| prescription_date | DATE | NULL | Date prescription was written |
| status | ENUM('pending', 'approved', 'rejected') | NOT NULL, DEFAULT 'pending' | Verification status |
| verified_by | INT | NULL, FOREIGN KEY | Reference to User (admin) who verified |
| verification_notes | TEXT | NULL | Notes from verification process |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_prescription_order`, `idx_prescription_status`
**Foreign Keys**: 
- `order_id` → `Order(order_id)`
- `verified_by` → `User(user_id)`

---

### Table 15: Cart
**Purpose**: Customer shopping cart management

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| cart_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique cart identifier |
| customer_id | INT | NOT NULL, FOREIGN KEY | Reference to Customer table |
| status | ENUM('active', 'inactive', 'converted') | NOT NULL, DEFAULT 'active' | Cart status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Cart creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_cart_customer`, `idx_cart_status`
**Foreign Keys**: `customer_id` → `Customer(customer_id)`

---

### Table 16: CartItem
**Purpose**: Individual items in customer shopping cart

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| cart_item_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique cart item identifier |
| cart_id | INT | NOT NULL, FOREIGN KEY | Reference to Cart table |
| inventory_id | INT | NOT NULL, FOREIGN KEY | Reference to PharmacyInventory table |
| quantity | INT | NOT NULL, CHECK (quantity > 0) | Quantity in cart |
| added_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Item addition timestamp |

**Indexes**: `idx_cartitem_cart`, `idx_cartitem_inventory`
**Foreign Keys**: 
- `cart_id` → `Cart(cart_id)`
- `inventory_id` → `PharmacyInventory(inventory_id)`

---

### Table 17: Payment
**Purpose**: Payment transaction records

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| payment_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique payment identifier |
| order_id | INT | NOT NULL, FOREIGN KEY | Reference to Order table |
| payment_method | ENUM('cod', 'gcash', 'card', 'bank_transfer') | NOT NULL | Payment method used |
| amount_paid | DECIMAL(10, 2) | NOT NULL, CHECK (amount_paid >= 0) | Actual amount paid |
| transaction_id | VARCHAR(255) | NULL | External payment transaction ID |
| image_proof | VARCHAR(255) | NULL | Payment proof image path |
| payment_status | ENUM('pending', 'processing', 'paid', 'failed', 'refunded') | NOT NULL, DEFAULT 'pending' | Payment status |
| paid_at | TIMESTAMP | NULL | Payment completion timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: `idx_payment_order`, `idx_payment_status`, `idx_payment_method`
**Foreign Keys**: `order_id` → `Order(order_id)`

---

### Table 18: Notification
**Purpose**: System notifications for users

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| notification_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique notification identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification content |
| type | ENUM('order_update', 'delivery', 'payment', 'system', 'promotion') | NOT NULL, DEFAULT 'system' | Notification type |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| read_at | TIMESTAMP | NULL | When notification was read |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Indexes**: `idx_notification_user`, `idx_notification_type`, `idx_notification_read`
**Foreign Keys**: `user_id` → `User(user_id)`

---

### Table 19: ChatRoom
**Purpose**: Chat rooms for order-related communication

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| room_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique chat room identifier |
| order_id | INT | NOT NULL, FOREIGN KEY | Reference to Order table |
| status | ENUM('open', 'closed') | NOT NULL, DEFAULT 'open' | Chat room status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Room creation timestamp |
| closed_at | TIMESTAMP | NULL | When room was closed |

**Indexes**: `idx_chatroom_order`, `idx_chatroom_status`
**Foreign Keys**: `order_id` → `Order(order_id)`

---

### Table 20: ChatParticipant
**Purpose**: Users participating in chat rooms

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| participant_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique participant identifier |
| room_id | INT | NOT NULL, FOREIGN KEY | Reference to ChatRoom table |
| user_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| role | ENUM('customer', 'rider', 'pharmacy') | NOT NULL | Participant role in chat |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When participant joined |
| left_at | TIMESTAMP | NULL | When participant left |

**Indexes**: `idx_participant_room`, `idx_participant_user`
**Foreign Keys**: 
- `room_id` → `ChatRoom(room_id)`
- `user_id` → `User(user_id)`

---

### Table 21: ChatMessage
**Purpose**: Individual messages in chat rooms

| ATTRIBUTE | TYPE | CONSTRAINTS | DESCRIPTION |
|-----------|------|-------------|-------------|
| message_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique message identifier |
| room_id | INT | NOT NULL, FOREIGN KEY | Reference to ChatRoom table |
| sender_id | INT | NOT NULL, FOREIGN KEY | Reference to User table |
| message | TEXT | NOT NULL | Message content |
| message_type | ENUM('text', 'image', 'file') | NOT NULL, DEFAULT 'text' | Type of message |
| file_path | VARCHAR(255) | NULL | File path for non-text messages |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| sent_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Message timestamp |

**Indexes**: `idx_message_room`, `idx_message_sender`, `idx_message_sent`
**Foreign Keys**: 
- `room_id` → `ChatRoom(room_id)`
- `sender_id` → `User(user_id)`

---

## Database Design Principles Applied

### 1. **Normalization**
- **1NF**: All attributes contain atomic values
- **2NF**: No partial dependencies on composite keys
- **3NF**: No transitive dependencies

### 2. **Constraints**
- **Primary Keys**: Auto-incrementing integers for all tables
- **Foreign Keys**: Proper referential integrity
- **Check Constraints**: Data validation (e.g., positive amounts, valid enums)
- **NOT NULL**: Required fields properly marked
- **UNIQUE**: Appropriate uniqueness constraints

### 3. **Indexing Strategy**
- **Primary Keys**: Automatically indexed
- **Foreign Keys**: Indexed for join performance
- **Frequently Queried Fields**: Status, dates, user IDs
- **Search Fields**: Names, categories, locations

### 4. **Data Types**
- **INT**: IDs and counts
- **VARCHAR**: Variable-length strings with appropriate limits
- **TEXT**: Long text content
- **DECIMAL**: Monetary values and precise measurements
- **TIMESTAMP**: Date and time with automatic updates
- **BOOLEAN**: True/false values
- **ENUM**: Predefined value sets

### 5. **Audit Trail**
- **created_at**: Record creation timestamp
- **updated_at**: Last modification timestamp
- **Status tracking**: Comprehensive status enums

---

## Performance Optimizations

### 1. **Indexes for Common Queries**
```sql
-- User authentication
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_username ON User(username);

-- Order management
CREATE INDEX idx_order_customer_status ON Order(customer_id, order_status);
CREATE INDEX idx_order_created ON Order(created_at);

-- Pharmacy inventory
CREATE INDEX idx_inventory_pharmacy_available ON PharmacyInventory(pharmacy_id, is_available);
CREATE INDEX idx_inventory_category ON PharmacyInventory(category_id);

-- Rider assignments
CREATE INDEX idx_assignment_rider_status ON RiderAssignment(rider_id, status);
CREATE INDEX idx_assignment_order ON RiderAssignment(order_id);
```

### 2. **Composite Indexes**
```sql
-- Multi-column searches
CREATE INDEX idx_medicine_search ON MedicineCatalog(category_id, form, is_active);
CREATE INDEX idx_inventory_search ON PharmacyInventory(pharmacy_id, category_id, is_available);
```

### 3. **Partial Indexes** (PostgreSQL)
```sql
-- Only index active records
CREATE INDEX idx_active_pharmacies ON Pharmacy(status) WHERE status = 'approved';
CREATE INDEX idx_online_riders ON Rider(is_online) WHERE is_online = TRUE;
```

---

## Security Considerations

### 1. **Data Protection**
- **Passwords**: Hashed using Django's built-in authentication
- **File Paths**: Store relative paths, not absolute system paths
- **Sensitive Data**: Encrypt personal information if required

### 2. **Access Control**
- **Role-based Access**: User roles determine system access
- **Foreign Key Constraints**: Prevent orphaned records
- **Audit Logging**: Track all data modifications

### 3. **Input Validation**
- **Check Constraints**: Database-level validation
- **Application Validation**: Django model validation
- **Type Safety**: Appropriate data types for each field

---

## Scalability Features

### 1. **Horizontal Scaling**
- **User Sharding**: Can partition by user_id ranges
- **Geographic Partitioning**: Location-based data distribution
- **Time-based Partitioning**: Historical data archiving

### 2. **Performance Monitoring**
- **Query Performance**: Monitor slow queries
- **Index Usage**: Track index effectiveness
- **Table Growth**: Monitor table sizes and growth rates

### 3. **Caching Strategy**
- **Product Catalog**: Cache frequently accessed medicine information
- **User Sessions**: Redis for session management
- **Location Data**: Cache recent rider locations

---

## Migration Strategy

### 1. **Version Control**
- **Schema Changes**: Track all modifications
- **Rollback Plans**: Prepare for schema reversions
- **Testing**: Validate changes in staging environment

### 2. **Data Migration**
- **Backup Strategy**: Full backups before major changes
- **Incremental Updates**: Minimize downtime
- **Validation**: Verify data integrity after migration

---

## Conclusion

This database schema provides a robust foundation for the Pharmago medicine delivery platform with:

- **Clear table relationships** and proper normalization
- **Comprehensive constraints** for data integrity
- **Optimized indexing** for performance
- **Scalable design** for future growth
- **Security considerations** for data protection
- **Audit trails** for compliance and debugging

The schema follows database design best practices and is optimized for Django ORM implementation while maintaining flexibility for future enhancements.

