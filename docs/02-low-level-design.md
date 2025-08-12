# Low-Level Design (LLD) - Blinkit-like MERN Application

## 🗄️ Database Schema Design

### MongoDB Collections

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String, // unique, indexed
  password: String, // hashed with bcrypt
  firstName: String,
  lastName: String,
  phone: String, // unique, indexed
  addresses: [{
    _id: ObjectId,
    type: String, // 'home', 'work', 'other'
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    isDefault: Boolean
  }],
  role: String, // 'customer', 'admin', 'delivery_partner'
  isActive: Boolean,
  emailVerified: Boolean,
  phoneVerified: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

#### 2. Categories Collection
```javascript
{
  _id: ObjectId,
  name: String, // indexed
  slug: String, // unique, indexed
  description: String,
  image: String, // S3 URL
  parentCategory: ObjectId, // reference to parent category
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Products Collection
```javascript
{
  _id: ObjectId,
  name: String, // indexed for search
  slug: String, // unique, indexed
  description: String,
  shortDescription: String,
  category: ObjectId, // reference to categories
  subcategory: ObjectId,
  brand: String,
  sku: String, // unique, indexed
  images: [String], // Array of S3 URLs
  price: {
    mrp: Number,
    sellingPrice: Number,
    discount: Number,
    discountType: String // 'percentage', 'fixed'
  },
  inventory: {
    quantity: Number,
    minStockLevel: Number,
    maxStockLevel: Number,
    unit: String, // 'kg', 'gm', 'ltr', 'ml', 'pieces'
    unitValue: Number
  },
  attributes: [{
    name: String,
    value: String
  }],
  tags: [String], // for search optimization
  ratings: {
    average: Number,
    count: Number
  },
  isActive: Boolean,
  isFeatured: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. Cart Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // indexed
  items: [{
    productId: ObjectId,
    quantity: Number,
    price: Number, // price at the time of adding to cart
    addedAt: Date
  }],
  totalAmount: Number,
  totalItems: Number,
  appliedCoupons: [{
    couponCode: String,
    discountAmount: Number,
    discountType: String
  }],
  expiresAt: Date, // TTL index for cart cleanup
  createdAt: Date,
  updatedAt: Date
}
```

#### 5. Orders Collection
```javascript
{
  _id: ObjectId,
  orderNumber: String, // unique, indexed
  userId: ObjectId, // indexed
  items: [{
    productId: ObjectId,
    name: String,
    image: String,
    quantity: Number,
    price: Number,
    totalPrice: Number
  }],
  pricing: {
    subtotal: Number,
    deliveryFee: Number,
    taxes: Number,
    discount: Number,
    totalAmount: Number
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  paymentDetails: {
    method: String, // 'card', 'upi', 'wallet', 'cod'
    transactionId: String,
    status: String, // 'pending', 'completed', 'failed', 'refunded'
    paidAt: Date
  },
  status: String, // 'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
  deliveryDetails: {
    partnerId: ObjectId,
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    trackingId: String
  },
  timeline: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 6. Inventory Collection
```javascript
{
  _id: ObjectId,
  productId: ObjectId, // unique, indexed
  availableQuantity: Number,
  reservedQuantity: Number, // for pending orders
  reorderLevel: Number,
  lastRestocked: Date,
  movements: [{
    type: String, // 'in', 'out', 'reserved', 'released'
    quantity: Number,
    reason: String,
    orderId: ObjectId, // if related to order
    timestamp: Date
  }],
  updatedAt: Date
}
```

### Redis Data Structures

#### 1. Session Management
```
Key: session:{sessionId}
Type: Hash
TTL: 24 hours
Fields: {
  userId: string,
  email: string,
  role: string,
  lastActivity: timestamp
}
```

#### 2. Cart Cache
```
Key: cart:{userId}
Type: Hash
TTL: 7 days
Fields: {
  items: JSON string,
  totalAmount: number,
  totalItems: number,
  updatedAt: timestamp
}
```

#### 3. Product Cache
```
Key: product:{productId}
Type: Hash
TTL: 1 hour
Fields: {
  data: JSON string,
  cachedAt: timestamp
}
```

#### 4. Inventory Lock
```
Key: inventory_lock:{productId}
Type: String
TTL: 10 minutes
Value: {orderId}:{quantity}:{timestamp}
```

## 🔌 API Endpoints Design

### Authentication Service APIs

#### POST /api/auth/register
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: UserProfile;
    token: string;
    refreshToken: string;
  };
}
```

#### POST /api/auth/login
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: UserProfile;
    token: string;
    refreshToken: string;
  };
}
```

### Product Service APIs

#### GET /api/products
```typescript
interface ProductListRequest {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: 'price' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

interface ProductListResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}
```

#### GET /api/products/:id
```typescript
interface ProductDetailResponse {
  success: boolean;
  data: {
    product: Product;
    relatedProducts: Product[];
    reviews: Review[];
  };
}
```

### Cart Service APIs

#### POST /api/cart/add
```typescript
interface AddToCartRequest {
  productId: string;
  quantity: number;
}

interface AddToCartResponse {
  success: boolean;
  message: string;
  data: {
    cart: Cart;
  };
}
```

#### GET /api/cart
```typescript
interface GetCartResponse {
  success: boolean;
  data: {
    cart: Cart;
    items: CartItem[];
  };
}
```

#### PUT /api/cart/update
```typescript
interface UpdateCartRequest {
  productId: string;
  quantity: number;
}
```

#### DELETE /api/cart/remove/:productId
```typescript
interface RemoveFromCartResponse {
  success: boolean;
  message: string;
  data: {
    cart: Cart;
  };
}
```

### Order Service APIs

#### POST /api/orders/create
```typescript
interface CreateOrderRequest {
  deliveryAddressId: string;
  paymentMethod: string;
  appliedCoupons?: string[];
}

interface CreateOrderResponse {
  success: boolean;
  data: {
    order: Order;
    paymentDetails: {
      orderId: string;
      amount: number;
      currency: string;
      paymentGatewayOrderId: string;
    };
  };
}
```

#### GET /api/orders
```typescript
interface OrderListResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: PaginationInfo;
  };
}
```

#### GET /api/orders/:id
```typescript
interface OrderDetailResponse {
  success: boolean;
  data: {
    order: Order;
    timeline: OrderTimeline[];
  };
}
```

## 🏗️ Class Diagrams

### Backend Service Classes

#### User Service
```typescript
class UserService {
  private userRepository: UserRepository;
  private passwordService: PasswordService;
  private tokenService: TokenService;

  async register(userData: RegisterRequest): Promise<User>;
  async login(credentials: LoginRequest): Promise<LoginResponse>;
  async getUserProfile(userId: string): Promise<User>;
  async updateProfile(userId: string, updates: Partial<User>): Promise<User>;
  async addAddress(userId: string, address: Address): Promise<User>;
  async updateAddress(userId: string, addressId: string, updates: Partial<Address>): Promise<User>;
  async deleteAddress(userId: string, addressId: string): Promise<void>;
}
```

#### Product Service
```typescript
class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;
  private cacheService: CacheService;

  async getProducts(filters: ProductFilters): Promise<PaginatedResponse<Product>>;
  async getProductById(productId: string): Promise<Product>;
  async searchProducts(query: string, filters: SearchFilters): Promise<Product[]>;
  async getProductsByCategory(categoryId: string): Promise<Product[]>;
  async getFeaturedProducts(): Promise<Product[]>;
  async getRelatedProducts(productId: string): Promise<Product[]>;
}
```

#### Cart Service
```typescript
class CartService {
  private cartRepository: CartRepository;
  private productService: ProductService;
  private inventoryService: InventoryService;
  private cacheService: CacheService;

  async addToCart(userId: string, item: CartItem): Promise<Cart>;
  async removeFromCart(userId: string, productId: string): Promise<Cart>;
  async updateCartItem(userId: string, productId: string, quantity: number): Promise<Cart>;
  async getCart(userId: string): Promise<Cart>;
  async clearCart(userId: string): Promise<void>;
  async validateCart(userId: string): Promise<CartValidationResult>;
}
```

#### Order Service
```typescript
class OrderService {
  private orderRepository: OrderRepository;
  private cartService: CartService;
  private inventoryService: InventoryService;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  async createOrder(userId: string, orderData: CreateOrderRequest): Promise<Order>;
  async getOrderById(orderId: string): Promise<Order>;
  async getUserOrders(userId: string, pagination: PaginationOptions): Promise<PaginatedResponse<Order>>;
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  async cancelOrder(orderId: string, reason: string): Promise<Order>;
  async trackOrder(orderId: string): Promise<OrderTracking>;
}
```

### Frontend Component Architecture

#### React Component Hierarchy
```
App
├── Router
├── AuthProvider
├── CartProvider
├── NotificationProvider
└── Layout
    ├── Header
    │   ├── SearchBar
    │   ├── CartIcon
    │   └── UserMenu
    ├── Sidebar
    │   └── CategoryMenu
    └── Main
        ├── HomePage
        │   ├── HeroSection
        │   ├── CategoryGrid
        │   └── FeaturedProducts
        ├── ProductListPage
        │   ├── FilterSidebar
        │   ├── ProductGrid
        │   └── Pagination
        ├── ProductDetailPage
        │   ├── ProductImages
        │   ├── ProductInfo
        │   └── RelatedProducts
        ├── CartPage
        │   ├── CartItems
        │   ├── PricingSummary
        │   └── CheckoutButton
        ├── CheckoutPage
        │   ├── AddressSelection
        │   ├── PaymentMethods
        │   └── OrderSummary
        └── OrdersPage
            ├── OrderList
            └── OrderDetail
```

## 🔄 Component Interactions

### Frontend-Backend Interaction Flow

#### 1. User Authentication Flow
```
LoginComponent → AuthService → API Gateway → Auth Service → MongoDB
                     ↓
              Redux Store Update → UI Update
```

#### 2. Product Browsing Flow
```
ProductList → ProductService → API Gateway → Product Service → MongoDB/Redis
                  ↓
            Component State Update → UI Render
```

#### 3. Add to Cart Flow
```
ProductDetail → CartService → API Gateway → Cart Service → Redis → Inventory Service
                   ↓
             Cart Context Update → Cart Icon Update
```

#### 4. Order Placement Flow
```
CheckoutPage → OrderService → API Gateway → Order Service → Multiple Services
                  ↓
            Order Confirmation → Notification → Payment Gateway
```

## 🎯 State Management (Redux)

### Store Structure
```typescript
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  products: {
    items: Product[];
    categories: Category[];
    filters: ProductFilters;
    loading: boolean;
    pagination: PaginationInfo;
  };
  cart: {
    items: CartItem[];
    totalAmount: number;
    totalItems: number;
    loading: boolean;
  };
  orders: {
    items: Order[];
    currentOrder: Order | null;
    loading: boolean;
  };
  ui: {
    notifications: Notification[];
    modals: ModalState;
    loading: boolean;
  };
}
```

### Redux Slices
```typescript
// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => { state.loading = true; },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
    },
    loginFailure: (state) => { state.loading = false; },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }
  }
});

// Cart Slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCartStart: (state) => { state.loading = true; },
    addToCartSuccess: (state, action) => {
      state.items = action.payload.items;
      state.totalAmount = action.payload.totalAmount;
      state.totalItems = action.payload.totalItems;
      state.loading = false;
    },
    updateCartItem: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find(item => item.productId === productId);
      if (item) {
        item.quantity = quantity;
      }
    }
  }
});
```

This Low-Level Design provides the detailed implementation structure for building the MERN application with proper database schemas, API designs, and component architectures.
