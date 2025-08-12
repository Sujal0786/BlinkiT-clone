# Process Flow - Blinkit-like MERN Application

## 🔄 Complete User Journey: Cart to Payment

### Overview
This document details the step-by-step process from when a user adds an item to their cart until the order is placed and paid for, including stock locking, payment gateway integration, and order confirmation.

## 📋 Process Flow Diagram

```
User Action → Frontend → API Gateway → Microservices → Database → Response
     ↓
[Add to Cart] → [Cart Service] → [Inventory Check] → [Redis Cache] → [UI Update]
     ↓
[Checkout] → [Order Service] → [Stock Lock] → [Payment Service] → [Confirmation]
     ↓
[Payment] → [Payment Gateway] → [Order Confirm] → [Notifications] → [Delivery]
```

## 🛒 Step-by-Step Process Flow

### Phase 1: Add Item to Cart

#### Step 1: User Adds Item to Cart
```typescript
// Frontend Action
const handleAddToCart = async (productId: string, quantity: number) => {
  try {
    setLoading(true);
    
    // Dispatch Redux action
    const result = await dispatch(addToCart({ productId, quantity }));
    
    if (result.type === 'cart/addToCart/fulfilled') {
      showNotification('Item added to cart successfully');
      updateCartIcon(result.payload.totalItems);
    }
  } catch (error) {
    showNotification('Failed to add item to cart', 'error');
  } finally {
    setLoading(false);
  }
};
```

#### Step 2: Frontend Validation
```typescript
// Client-side validation before API call
const validateAddToCart = (product: Product, quantity: number): ValidationResult => {
  const errors: string[] = [];
  
  if (!product.isActive) {
    errors.push('Product is not available');
  }
  
  if (quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (quantity > product.inventory.quantity) {
    errors.push(`Only ${product.inventory.quantity} items available`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

#### Step 3: API Gateway Processing
```typescript
// API Gateway middleware
app.post('/api/cart/add', [
  authenticateToken,
  validateRequest(addToCartSchema),
  rateLimiter({ windowMs: 60000, max: 100 }),
  async (req, res, next) => {
    try {
      // Route to Cart Service
      const response = await cartService.addToCart(req.user.id, req.body);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
]);
```

#### Step 4: Cart Service Processing
```typescript
class CartService {
  async addToCart(userId: string, item: AddToCartRequest): Promise<CartResponse> {
    // 1. Validate product exists and is active
    const product = await this.productService.getProduct(item.productId);
    if (!product || !product.isActive) {
      throw new BadRequestError('Product not available');
    }
    
    // 2. Check inventory availability
    const inventory = await this.inventoryService.getInventory(item.productId);
    if (inventory.availableQuantity < item.quantity) {
      throw new BadRequestError('Insufficient stock');
    }
    
    // 3. Get or create cart
    let cart = await this.getCartFromCache(userId);
    if (!cart) {
      cart = await this.cartRepository.findByUserId(userId);
      if (!cart) {
        cart = await this.createNewCart(userId);
      }
    }
    
    // 4. Update cart item
    const existingItemIndex = cart.items.findIndex(
      cartItem => cartItem.productId.toString() === item.productId
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      cart.items[existingItemIndex].quantity += item.quantity;
      cart.items[existingItemIndex].updatedAt = new Date();
    } else {
      // Add new item
      cart.items.push({
        productId: new ObjectId(item.productId),
        quantity: item.quantity,
        price: product.price.sellingPrice,
        addedAt: new Date()
      });
    }
    
    // 5. Recalculate totals
    cart = await this.recalculateCart(cart);
    
    // 6. Save to database and cache
    await this.cartRepository.save(cart);
    await this.saveCartToCache(userId, cart);
    
    // 7. Return response
    return {
      success: true,
      message: 'Item added to cart successfully',
      data: { cart }
    };
  }
}
```

### Phase 2: Checkout Process

#### Step 5: User Initiates Checkout
```typescript
// Frontend checkout process
const handleCheckout = async () => {
  try {
    setCheckoutLoading(true);
    
    // 1. Validate cart
    const cartValidation = await dispatch(validateCart());
    if (!cartValidation.payload.isValid) {
      setCartErrors(cartValidation.payload.errors);
      return;
    }
    
    // 2. Navigate to checkout page
    navigate('/checkout');
    
  } catch (error) {
    showNotification('Checkout failed', 'error');
  } finally {
    setCheckoutLoading(false);
  }
};
```

#### Step 6: Cart Validation
```typescript
class CartValidationService {
  async validateCart(userId: string): Promise<CartValidationResult> {
    const cart = await this.cartService.getCart(userId);
    const validationResult: CartValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      updatedItems: []
    };
    
    // Validate each cart item
    for (const item of cart.items) {
      // Check product availability
      const product = await this.productService.getProduct(item.productId);
      if (!product || !product.isActive) {
        validationResult.errors.push({
          productId: item.productId,
          message: 'Product no longer available'
        });
        validationResult.isValid = false;
        continue;
      }
      
      // Check inventory
      const inventory = await this.inventoryService.getInventory(item.productId);
      if (inventory.availableQuantity < item.quantity) {
        if (inventory.availableQuantity === 0) {
          validationResult.errors.push({
            productId: item.productId,
            message: 'Product out of stock'
          });
          validationResult.isValid = false;
        } else {
          validationResult.warnings.push({
            productId: item.productId,
            message: `Only ${inventory.availableQuantity} items available`,
            availableQuantity: inventory.availableQuantity
          });
        }
      }
      
      // Check price changes
      if (Math.abs(item.price - product.price.sellingPrice) > 0.01) {
        validationResult.warnings.push({
          productId: item.productId,
          message: 'Price has changed',
          oldPrice: item.price,
          newPrice: product.price.sellingPrice
        });
      }
    }
    
    return validationResult;
  }
}
```

### Phase 3: Order Creation and Stock Locking

#### Step 7: Create Order with Stock Reservation
```typescript
class OrderService {
  async createOrder(userId: string, orderData: CreateOrderRequest): Promise<OrderResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 1. Validate cart one more time
      const cartValidation = await this.cartValidationService.validateCart(userId);
      if (!cartValidation.isValid) {
        throw new BadRequestError('Cart validation failed', cartValidation.errors);
      }
      
      // 2. Get cart details
      const cart = await this.cartService.getCart(userId);
      if (!cart || cart.items.length === 0) {
        throw new BadRequestError('Cart is empty');
      }
      
      // 3. Reserve stock for all items
      const reservations: StockReservation[] = [];
      for (const item of cart.items) {
        const reservation = await this.inventoryService.reserveStock(
          item.productId.toString(),
          item.quantity,
          `temp_${Date.now()}_${userId}` // Temporary order ID
        );
        
        if (!reservation.success) {
          // Rollback previous reservations
          await this.rollbackReservations(reservations);
          throw new BadRequestError(`Insufficient stock for ${item.productId}`);
        }
        
        reservations.push(reservation);
      }
      
      // 4. Create order document
      const orderNumber = await this.generateOrderNumber();
      const order = new Order({
        orderNumber,
        userId: new ObjectId(userId),
        items: cart.items.map(item => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.quantity * item.price
        })),
        pricing: await this.calculatePricing(cart),
        deliveryAddress: orderData.deliveryAddress,
        paymentDetails: {
          method: orderData.paymentMethod,
          status: 'pending'
        },
        status: 'created',
        timeline: [{
          status: 'created',
          timestamp: new Date(),
          note: 'Order created successfully'
        }]
      });
      
      // 5. Save order
      const savedOrder = await order.save({ session });
      
      // 6. Update reservations with actual order ID
      for (const reservation of reservations) {
        await this.inventoryService.updateReservationOrderId(
          reservation.reservationId,
          savedOrder._id.toString()
        );
      }
      
      // 7. Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent({
        orderId: savedOrder._id.toString(),
        amount: savedOrder.pricing.totalAmount,
        currency: 'INR',
        userId
      });
      
      // 8. Update order with payment details
      savedOrder.paymentDetails.transactionId = paymentIntent.id;
      await savedOrder.save({ session });
      
      await session.commitTransaction();
      
      // 9. Publish order created event
      await this.eventPublisher.publish(EventType.ORDER_CREATED, {
        orderId: savedOrder._id.toString(),
        userId,
        items: savedOrder.items,
        totalAmount: savedOrder.pricing.totalAmount
      });
      
      return {
        success: true,
        data: {
          order: savedOrder,
          paymentDetails: paymentIntent
        }
      };
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

### Phase 4: Payment Processing

#### Step 8: Payment Gateway Integration
```typescript
class PaymentService {
  async processPayment(paymentData: ProcessPaymentRequest): Promise<PaymentResult> {
    try {
      // 1. Verify payment with gateway
      const isValidPayment = await this.paymentGateway.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature
      });
      
      if (!isValidPayment) {
        throw new BadRequestError('Payment verification failed');
      }
      
      // 2. Get payment details from gateway
      const paymentDetails = await this.paymentGateway.getPayment(
        paymentData.razorpay_payment_id
      );
      
      // 3. Update order payment status
      const order = await this.orderService.updatePaymentStatus(
        paymentData.orderId,
        {
          status: 'completed',
          transactionId: paymentData.razorpay_payment_id,
          paidAt: new Date(),
          amount: paymentDetails.amount / 100, // Convert from paise
          method: paymentDetails.method
        }
      );
      
      // 4. Confirm stock reservations
      for (const item of order.items) {
        await this.inventoryService.confirmReservation(
          item.productId.toString(),
          order._id.toString()
        );
      }
      
      // 5. Clear user's cart
      await this.cartService.clearCart(order.userId.toString());
      
      // 6. Update order status
      await this.orderService.updateOrderStatus(
        order._id.toString(),
        'confirmed',
        'Payment completed successfully'
      );
      
      // 7. Publish payment completed event
      await this.eventPublisher.publish(EventType.PAYMENT_COMPLETED, {
        orderId: order._id.toString(),
        userId: order.userId.toString(),
        amount: paymentDetails.amount / 100,
        paymentId: paymentData.razorpay_payment_id
      });
      
      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          order,
          paymentId: paymentData.razorpay_payment_id
        }
      };
      
    } catch (error) {
      // Handle payment failure
      await this.handlePaymentFailure(paymentData.orderId, error.message);
      throw error;
    }
  }
  
  private async handlePaymentFailure(orderId: string, reason: string): Promise<void> {
    // 1. Update order status
    await this.orderService.updateOrderStatus(orderId, 'payment_failed', reason);
    
    // 2. Release stock reservations
    const order = await this.orderService.getOrder(orderId);
    for (const item of order.items) {
      await this.inventoryService.releaseReservation(
        item.productId.toString(),
        orderId
      );
    }
    
    // 3. Send notification to user
    await this.notificationService.sendEmail(
      order.userId.toString(),
      'payment-failed',
      { orderNumber: order.orderNumber, reason }
    );
  }
}
```

### Phase 5: Order Confirmation and Notifications

#### Step 9: Order Confirmation Process
```typescript
class OrderConfirmationService {
  async confirmOrder(orderId: string): Promise<void> {
    const order = await this.orderService.getOrder(orderId);
    
    // 1. Send confirmation email
    await this.notificationService.sendEmail(
      order.userId.toString(),
      'order-confirmation',
      {
        orderNumber: order.orderNumber,
        items: order.items,
        totalAmount: order.pricing.totalAmount,
        deliveryAddress: order.deliveryAddress,
        estimatedDeliveryTime: this.calculateDeliveryTime(order.deliveryAddress)
      }
    );
    
    // 2. Send SMS notification
    const user = await this.userService.getUser(order.userId.toString());
    await this.notificationService.sendSMS(
      user.phone,
      `Order ${order.orderNumber} confirmed! Expected delivery in 30-45 minutes.`
    );
    
    // 3. Create in-app notification
    await this.notificationService.createInAppNotification(
      order.userId.toString(),
      {
        title: 'Order Confirmed',
        message: `Your order ${order.orderNumber} has been confirmed and will be delivered soon.`,
        type: 'order_confirmation',
        data: { orderId: order._id.toString() }
      }
    );
    
    // 4. Assign delivery partner
    await this.deliveryService.assignDelivery(orderId, {
      priority: 'normal',
      deliveryAddress: order.deliveryAddress,
      items: order.items
    });
    
    // 5. Update inventory
    for (const item of order.items) {
      await this.inventoryService.updateStock(
        item.productId.toString(),
        item.quantity,
        'subtract'
      );
    }
  }
}
```

### Phase 6: Real-time Order Tracking

#### Step 10: Order Tracking Implementation
```typescript
class OrderTrackingService {
  async trackOrder(orderId: string): Promise<OrderTracking> {
    const order = await this.orderService.getOrder(orderId);
    const delivery = await this.deliveryService.getDeliveryByOrderId(orderId);
    
    return {
      orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      timeline: order.timeline,
      currentLocation: delivery?.currentLocation,
      estimatedDeliveryTime: delivery?.estimatedDeliveryTime,
      deliveryPartner: delivery?.partner ? {
        name: delivery.partner.name,
        phone: delivery.partner.phone,
        rating: delivery.partner.rating
      } : null
    };
  }
  
  // WebSocket implementation for real-time updates
  async subscribeToOrderUpdates(userId: string, orderId: string): Promise<void> {
    const socketRoom = `order_${orderId}`;
    
    // Join user to order room
    this.socketService.joinRoom(userId, socketRoom);
    
    // Listen for order status updates
    this.eventBus.on(`order.status.updated.${orderId}`, (data) => {
      this.socketService.emitToRoom(socketRoom, 'order_status_updated', data);
    });
    
    // Listen for delivery location updates
    this.eventBus.on(`delivery.location.updated.${orderId}`, (data) => {
      this.socketService.emitToRoom(socketRoom, 'delivery_location_updated', data);
    });
  }
}
```

## 🔒 Error Handling and Rollback Mechanisms

### Transaction Management
```typescript
class TransactionManager {
  async executeWithRollback<T>(
    operations: TransactionOperation[],
    rollbackOperations: RollbackOperation[]
  ): Promise<T> {
    const completedOperations: number[] = [];
    
    try {
      for (let i = 0; i < operations.length; i++) {
        await operations[i].execute();
        completedOperations.push(i);
      }
      
      return operations[operations.length - 1].result;
      
    } catch (error) {
      // Rollback completed operations in reverse order
      for (let i = completedOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[completedOperations[i]].execute();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }
}
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

This comprehensive process flow ensures a robust, reliable, and user-friendly experience from cart addition to order completion with proper error handling and rollback mechanisms.
