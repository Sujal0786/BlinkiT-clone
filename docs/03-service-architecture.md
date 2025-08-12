# Service Architecture - Blinkit-like MERN Application

## 🏗️ Microservices Detailed Design

### 1. Authentication Service

#### Responsibilities
- User registration and login
- JWT token generation and validation
- Password management and reset
- OAuth integration (Google, Facebook)
- Role-based access control (RBAC)
- Session management

#### Key Features
```typescript
interface AuthService {
  // User Management
  register(userData: RegisterRequest): Promise<AuthResponse>;
  login(credentials: LoginRequest): Promise<AuthResponse>;
  logout(token: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  
  // Password Management
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  
  // Token Management
  validateToken(token: string): Promise<TokenValidation>;
  revokeToken(token: string): Promise<void>;
  
  // OAuth
  googleAuth(googleToken: string): Promise<AuthResponse>;
  facebookAuth(facebookToken: string): Promise<AuthResponse>;
}
```

#### Security Implementation
```typescript
// JWT Configuration
const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'blinkit-app',
  audience: 'blinkit-users'
};

// Password Hashing
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Token Generation
const generateTokens = (user: User) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: jwtConfig.accessTokenExpiry
  });
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: jwtConfig.refreshTokenExpiry
  });
  
  return { accessToken, refreshToken };
};
```

### 2. Product Service

#### Responsibilities
- Product catalog management
- Category and subcategory management
- Search and filtering functionality
- Product recommendations
- Image management and optimization
- Product reviews and ratings

#### Key Features
```typescript
interface ProductService {
  // Product Management
  createProduct(productData: CreateProductRequest): Promise<Product>;
  updateProduct(productId: string, updates: UpdateProductRequest): Promise<Product>;
  deleteProduct(productId: string): Promise<void>;
  getProduct(productId: string): Promise<Product>;
  
  // Product Listing
  getProducts(filters: ProductFilters): Promise<PaginatedResponse<Product>>;
  searchProducts(query: string, filters: SearchFilters): Promise<Product[]>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  
  // Recommendations
  getRelatedProducts(productId: string): Promise<Product[]>;
  getRecommendedProducts(userId: string): Promise<Product[]>;
  
  // Categories
  createCategory(categoryData: CreateCategoryRequest): Promise<Category>;
  getCategories(): Promise<Category[]>;
  updateCategory(categoryId: string, updates: UpdateCategoryRequest): Promise<Category>;
}
```

#### Search Implementation
```typescript
// Elasticsearch Integration for Advanced Search
class ProductSearchService {
  private elasticClient: Client;
  
  async indexProduct(product: Product): Promise<void> {
    await this.elasticClient.index({
      index: 'products',
      id: product._id.toString(),
      body: {
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        tags: product.tags,
        price: product.price.sellingPrice,
        rating: product.ratings.average,
        isActive: product.isActive
      }
    });
  }
  
  async searchProducts(query: string, filters: SearchFilters): Promise<Product[]> {
    const searchQuery = {
      index: 'products',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query,
                  fields: ['name^3', 'description^2', 'brand', 'tags'],
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: this.buildFilters(filters)
          }
        },
        sort: this.buildSort(filters.sortBy, filters.sortOrder),
        size: filters.limit || 20,
        from: (filters.page - 1) * (filters.limit || 20)
      }
    };
    
    const response = await this.elasticClient.search(searchQuery);
    return response.body.hits.hits.map(hit => hit._source);
  }
}
```

### 3. Cart Service

#### Responsibilities
- Add/remove items from cart
- Cart persistence across sessions
- Cart validation before checkout
- Promotional code application
- Cart abandonment tracking
- Real-time cart synchronization

#### Key Features
```typescript
interface CartService {
  // Cart Operations
  addToCart(userId: string, item: AddToCartRequest): Promise<Cart>;
  removeFromCart(userId: string, productId: string): Promise<Cart>;
  updateCartItem(userId: string, productId: string, quantity: number): Promise<Cart>;
  clearCart(userId: string): Promise<void>;
  
  // Cart Retrieval
  getCart(userId: string): Promise<Cart>;
  getCartSummary(userId: string): Promise<CartSummary>;
  
  // Validation
  validateCart(userId: string): Promise<CartValidationResult>;
  checkItemAvailability(userId: string): Promise<AvailabilityCheck>;
  
  // Coupons
  applyCoupon(userId: string, couponCode: string): Promise<Cart>;
  removeCoupon(userId: string, couponCode: string): Promise<Cart>;
}
```

#### Cart Validation Logic
```typescript
class CartValidationService {
  async validateCart(userId: string): Promise<CartValidationResult> {
    const cart = await this.getCart(userId);
    const validationResult: CartValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      updatedItems: []
    };
    
    for (const item of cart.items) {
      // Check product availability
      const product = await this.productService.getProduct(item.productId);
      if (!product || !product.isActive) {
        validationResult.errors.push({
          productId: item.productId,
          message: 'Product is no longer available'
        });
        validationResult.isValid = false;
        continue;
      }
      
      // Check inventory
      const inventory = await this.inventoryService.getInventory(item.productId);
      if (inventory.availableQuantity < item.quantity) {
        validationResult.warnings.push({
          productId: item.productId,
          message: `Only ${inventory.availableQuantity} items available`,
          availableQuantity: inventory.availableQuantity
        });
        
        validationResult.updatedItems.push({
          productId: item.productId,
          oldQuantity: item.quantity,
          newQuantity: inventory.availableQuantity
        });
      }
      
      // Check price changes
      if (item.price !== product.price.sellingPrice) {
        validationResult.warnings.push({
          productId: item.productId,
          message: 'Price has changed',
          oldPrice: item.price,
          newPrice: product.price.sellingPrice
        });
        
        validationResult.updatedItems.push({
          productId: item.productId,
          oldPrice: item.price,
          newPrice: product.price.sellingPrice
        });
      }
    }
    
    return validationResult;
  }
}
```

### 4. Inventory Service

#### Responsibilities
- Real-time stock management
- Stock reservation during checkout
- Inventory tracking and auditing
- Low stock alerts
- Supplier management
- Automated reordering

#### Key Features
```typescript
interface InventoryService {
  // Stock Management
  updateStock(productId: string, quantity: number, operation: 'add' | 'subtract'): Promise<Inventory>;
  getInventory(productId: string): Promise<Inventory>;
  getBulkInventory(productIds: string[]): Promise<Inventory[]>;
  
  // Stock Reservation
  reserveStock(productId: string, quantity: number, orderId: string): Promise<ReservationResult>;
  releaseReservation(productId: string, orderId: string): Promise<void>;
  confirmReservation(productId: string, orderId: string): Promise<void>;
  
  // Alerts and Monitoring
  checkLowStock(): Promise<LowStockAlert[]>;
  getInventoryMovements(productId: string): Promise<InventoryMovement[]>;
  
  // Bulk Operations
  bulkUpdateInventory(updates: BulkInventoryUpdate[]): Promise<BulkUpdateResult>;
}
```

#### Stock Reservation Implementation
```typescript
class StockReservationService {
  private redisClient: Redis;
  
  async reserveStock(productId: string, quantity: number, orderId: string): Promise<ReservationResult> {
    const lockKey = `inventory_lock:${productId}`;
    const reservationKey = `reservation:${productId}:${orderId}`;
    
    // Acquire distributed lock
    const lock = await this.redisClient.set(lockKey, orderId, 'PX', 10000, 'NX');
    if (!lock) {
      throw new Error('Unable to acquire inventory lock');
    }
    
    try {
      // Check current inventory
      const inventory = await this.getInventory(productId);
      const availableQuantity = inventory.availableQuantity - inventory.reservedQuantity;
      
      if (availableQuantity < quantity) {
        return {
          success: false,
          message: 'Insufficient stock',
          availableQuantity
        };
      }
      
      // Create reservation
      await this.inventoryRepository.updateOne(
        { productId },
        { $inc: { reservedQuantity: quantity } }
      );
      
      // Set reservation expiry (10 minutes)
      await this.redisClient.setex(reservationKey, 600, JSON.stringify({
        productId,
        quantity,
        orderId,
        reservedAt: new Date()
      }));
      
      // Log inventory movement
      await this.logInventoryMovement({
        productId,
        type: 'reserved',
        quantity,
        orderId,
        timestamp: new Date()
      });
      
      return {
        success: true,
        reservationId: reservationKey,
        expiresAt: new Date(Date.now() + 600000)
      };
      
    } finally {
      // Release lock
      await this.redisClient.del(lockKey);
    }
  }
  
  async releaseReservation(productId: string, orderId: string): Promise<void> {
    const reservationKey = `reservation:${productId}:${orderId}`;
    const reservation = await this.redisClient.get(reservationKey);
    
    if (reservation) {
      const reservationData = JSON.parse(reservation);
      
      // Release reserved quantity
      await this.inventoryRepository.updateOne(
        { productId },
        { $inc: { reservedQuantity: -reservationData.quantity } }
      );
      
      // Remove reservation
      await this.redisClient.del(reservationKey);
      
      // Log inventory movement
      await this.logInventoryMovement({
        productId,
        type: 'released',
        quantity: reservationData.quantity,
        orderId,
        timestamp: new Date()
      });
    }
  }
}
```

### 5. Order Service

#### Responsibilities
- Order creation and management
- Order status tracking and updates
- Order history and analytics
- Order cancellation and refunds
- Integration with payment and delivery services

#### Key Features
```typescript
interface OrderService {
  // Order Management
  createOrder(userId: string, orderData: CreateOrderRequest): Promise<Order>;
  getOrder(orderId: string): Promise<Order>;
  getUserOrders(userId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Order>>;
  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order>;
  
  // Order Operations
  cancelOrder(orderId: string, reason: string): Promise<Order>;
  refundOrder(orderId: string, refundData: RefundRequest): Promise<RefundResult>;
  
  // Tracking
  trackOrder(orderId: string): Promise<OrderTracking>;
  getOrderTimeline(orderId: string): Promise<OrderTimeline[]>;
  
  // Analytics
  getOrderAnalytics(filters: AnalyticsFilters): Promise<OrderAnalytics>;
}
```

### 6. Payment Service

#### Responsibilities
- Payment gateway integration
- Payment processing and validation
- Refund management
- Payment method management
- Transaction history and reconciliation

#### Key Features
```typescript
interface PaymentService {
  // Payment Processing
  createPaymentIntent(orderData: PaymentIntentRequest): Promise<PaymentIntent>;
  processPayment(paymentData: ProcessPaymentRequest): Promise<PaymentResult>;
  verifyPayment(paymentId: string): Promise<PaymentVerification>;
  
  // Refund Management
  initiateRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult>;
  getRefundStatus(refundId: string): Promise<RefundStatus>;
  
  // Payment Methods
  savePaymentMethod(userId: string, paymentMethod: PaymentMethod): Promise<void>;
  getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
  deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void>;
}
```

#### Payment Gateway Integration
```typescript
class RazorpayPaymentService implements PaymentGateway {
  private razorpay: Razorpay;
  
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  
  async createPaymentIntent(orderData: PaymentIntentRequest): Promise<PaymentIntent> {
    const options = {
      amount: orderData.amount * 100, // Convert to paise
      currency: 'INR',
      receipt: orderData.orderId,
      payment_capture: 1,
      notes: {
        orderId: orderData.orderId,
        userId: orderData.userId
      }
    };
    
    const razorpayOrder = await this.razorpay.orders.create(options);
    
    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount / 100,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
      createdAt: new Date(razorpayOrder.created_at * 1000)
    };
  }
  
  async verifyPayment(paymentData: PaymentVerificationRequest): Promise<boolean> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    return expectedSignature === razorpay_signature;
  }
}
```

### 7. Notification Service

#### Responsibilities
- Email notifications
- SMS notifications
- Push notifications
- In-app notifications
- Notification templates and personalization

#### Key Features
```typescript
interface NotificationService {
  // Email Notifications
  sendEmail(to: string, template: string, data: any): Promise<void>;
  sendBulkEmail(recipients: string[], template: string, data: any): Promise<void>;
  
  // SMS Notifications
  sendSMS(phone: string, message: string): Promise<void>;
  sendOTP(phone: string, otp: string): Promise<void>;
  
  // Push Notifications
  sendPushNotification(userId: string, notification: PushNotification): Promise<void>;
  sendBulkPushNotification(userIds: string[], notification: PushNotification): Promise<void>;
  
  // In-app Notifications
  createInAppNotification(userId: string, notification: InAppNotification): Promise<void>;
  getNotifications(userId: string): Promise<InAppNotification[]>;
  markAsRead(userId: string, notificationId: string): Promise<void>;
}
```

### 8. Delivery Service

#### Responsibilities
- Delivery partner management
- Route optimization
- Real-time tracking
- Delivery scheduling
- Performance analytics

#### Key Features
```typescript
interface DeliveryService {
  // Delivery Management
  assignDelivery(orderId: string, deliveryData: DeliveryAssignment): Promise<DeliveryAssignment>;
  updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void>;
  getDeliveryDetails(deliveryId: string): Promise<DeliveryDetails>;
  
  // Route Optimization
  optimizeRoute(deliveries: DeliveryRequest[]): Promise<OptimizedRoute>;
  calculateDeliveryTime(origin: Location, destination: Location): Promise<number>;
  
  // Tracking
  trackDelivery(deliveryId: string): Promise<DeliveryTracking>;
  updateLocation(deliveryId: string, location: Location): Promise<void>;
  
  // Partner Management
  getAvailablePartners(location: Location): Promise<DeliveryPartner[]>;
  assignPartner(deliveryId: string, partnerId: string): Promise<void>;
}
```

## 🔄 Inter-Service Communication

### Event-Driven Architecture
```typescript
// Event Types
enum EventType {
  USER_REGISTERED = 'user.registered',
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  PAYMENT_COMPLETED = 'payment.completed',
  INVENTORY_UPDATED = 'inventory.updated',
  DELIVERY_ASSIGNED = 'delivery.assigned'
}

// Event Publisher
class EventPublisher {
  private messageQueue: MessageQueue;
  
  async publish(eventType: EventType, data: any): Promise<void> {
    const event = {
      id: uuidv4(),
      type: eventType,
      data,
      timestamp: new Date(),
      source: process.env.SERVICE_NAME
    };
    
    await this.messageQueue.publish(eventType, event);
  }
}

// Event Handlers
class OrderEventHandler {
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Update inventory
    await this.inventoryService.confirmReservation(event.data.productId, event.data.orderId);
    
    // Send notification
    await this.notificationService.sendEmail(
      event.data.userEmail,
      'order-confirmation',
      event.data
    );
    
    // Assign delivery
    await this.deliveryService.assignDelivery(event.data.orderId, {
      address: event.data.deliveryAddress,
      priority: 'normal'
    });
  }
}
```

This service architecture provides a comprehensive foundation for building a scalable and maintainable MERN application with proper separation of concerns and robust inter-service communication.
