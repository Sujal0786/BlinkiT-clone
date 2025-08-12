# Code Examples - Blinkit-like MERN Application

## 🔧 Backend Code Examples

### Authentication Service Implementation

#### User Model (MongoDB Schema)
```typescript
// models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  addresses: IAddress[];
  role: 'customer' | 'admin' | 'delivery_partner';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IAddress {
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
}

const addressSchema = new Schema<IAddress>({
  type: { type: String, enum: ['home', 'work', 'other'], required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    index: true 
  },
  password: { type: String, required: true, minlength: 8 },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, index: true },
  addresses: [addressSchema],
  role: { 
    type: String, 
    enum: ['customer', 'admin', 'delivery_partner'], 
    default: 'customer' 
  },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
```

#### Auth Controller
```typescript
// controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { validateInput } from '../middleware/validation';
import { userRegistrationSchema, loginSchema } from '../schemas/authSchemas';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = userRegistrationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: value.email }, { phone: value.phone }]
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User already exists with this email or phone'
        });
        return;
      }

      // Create new user
      const user = new User(value);
      await user.save();

      // Generate tokens
      const tokens = this.authService.generateTokens(user);

      // Save refresh token to Redis
      await this.authService.saveRefreshToken(user._id.toString(), tokens.refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role
          },
          ...tokens
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      // Find user
      const user = await User.findOne({ email: value.email });
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Check password
      const isPasswordValid = await user.comparePassword(value.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate tokens
      const tokens = this.authService.generateTokens(user);

      // Save refresh token
      await this.authService.saveRefreshToken(user._id.toString(), tokens.refreshToken);

      // Update last login
      user.set({ lastLoginAt: new Date() });
      await user.save();

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role
          },
          ...tokens
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
```

### Product Service Implementation

#### Product Model
```typescript
// models/Product.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;
  brand: string;
  sku: string;
  images: string[];
  price: {
    mrp: number;
    sellingPrice: number;
    discount: number;
    discountType: 'percentage' | 'fixed';
  };
  inventory: {
    quantity: number;
    minStockLevel: number;
    maxStockLevel: number;
    unit: string;
    unitValue: number;
  };
  attributes: Array<{
    name: string;
    value: string;
  }>;
  tags: string[];
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  isFeatured: boolean;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  shortDescription: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String, required: true },
  sku: { type: String, required: true, unique: true, index: true },
  images: [{ type: String, required: true }],
  price: {
    mrp: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' }
  },
  inventory: {
    quantity: { type: Number, required: true, min: 0 },
    minStockLevel: { type: Number, default: 10 },
    maxStockLevel: { type: Number, default: 1000 },
    unit: { type: String, required: true },
    unitValue: { type: Number, required: true }
  },
  attributes: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  tags: [{ type: String, index: true }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

// Text search index
productSchema.index({
  name: 'text',
  description: 'text',
  brand: 'text',
  tags: 'text'
});

// Compound indexes for common queries
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'price.sellingPrice': 1 });
productSchema.index({ 'ratings.average': -1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
```

#### Product Controller
```typescript
// controllers/productController.ts
import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { ProductService } from '../services/ProductService';
import { CacheService } from '../services/CacheService';

export class ProductController {
  private productService: ProductService;
  private cacheService: CacheService;

  constructor() {
    this.productService = new ProductService();
    this.cacheService = new CacheService();
  }

  getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        minPrice,
        maxPrice
      } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        category: category as string,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined
      };

      // Generate cache key
      const cacheKey = `products:${JSON.stringify(filters)}`;
      
      // Try to get from cache
      let result = await this.cacheService.get(cacheKey);
      
      if (!result) {
        result = await this.productService.getProducts(filters);
        await this.cacheService.set(cacheKey, result, 300); // 5 minutes cache
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Try cache first
      const cacheKey = `product:${id}`;
      let product = await this.cacheService.get(cacheKey);
      
      if (!product) {
        product = await Product.findById(id)
          .populate('category', 'name slug')
          .populate('subcategory', 'name slug');
        
        if (!product || !product.isActive) {
          res.status(404).json({
            success: false,
            message: 'Product not found'
          });
          return;
        }
        
        await this.cacheService.set(cacheKey, product, 3600); // 1 hour cache
      }

      // Get related products
      const relatedProducts = await this.productService.getRelatedProducts(id);

      res.json({
        success: true,
        data: {
          product,
          relatedProducts
        }
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
```

## 🎨 Frontend Code Examples

### React Components

#### Product List Component
```tsx
// components/ProductList.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Card, CardMedia, CardContent, Typography, Button, Box, Pagination } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { fetchProducts, addToCart } from '../store/slices/productSlice';
import { RootState } from '../store';
import { Product } from '../types';

interface ProductListProps {
  categoryId?: string;
  searchQuery?: string;
}

export const ProductList: React.FC<ProductListProps> = ({ categoryId, searchQuery }) => {
  const dispatch = useDispatch();
  const { products, loading, pagination } = useSelector((state: RootState) => state.products);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchProducts({
      page,
      limit: 20,
      category: categoryId,
      search: searchQuery
    }));
  }, [dispatch, page, categoryId, searchQuery]);

  const handleAddToCart = async (product: Product) => {
    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1
      })).unwrap();
      
      // Show success notification
      // You can use a toast library here
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={product.images[0]}
                alt={product.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="h2" noWrap>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {product.shortDescription}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary" sx={{ mr: 1 }}>
                    ₹{product.price.sellingPrice}
                  </Typography>
                  {product.price.mrp > product.price.sellingPrice && (
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                      ₹{product.price.mrp}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  fullWidth
                  onClick={() => handleAddToCart(product)}
                  disabled={product.inventory.quantity === 0}
                >
                  {product.inventory.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};
```

#### Cart Component
```tsx
// components/Cart.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Button,
  Box,
  Divider
} from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { updateCartItem, removeFromCart } from '../store/slices/cartSlice';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';

interface CartProps {
  open: boolean;
  onClose: () => void;
}

export const Cart: React.FC<CartProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalAmount, totalItems, loading } = useSelector((state: RootState) => state.cart);

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeFromCart(productId));
    } else {
      dispatch(updateCartItem({ productId, quantity }));
    }
  };

  const handleRemoveItem = (productId: string) => {
    dispatch(removeFromCart(productId));
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shopping Cart ({totalItems} items)
        </Typography>
        
        {items.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Your cart is empty
          </Typography>
        ) : (
          <>
            <List>
              {items.map((item) => (
                <ListItem key={item.productId} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar src={item.image} alt={item.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={`₹${item.price} each`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Remove />
                    </IconButton>
                    <Typography sx={{ mx: 1, minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Add />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(item.productId)}
                      sx={{ ml: 1 }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ₹{totalAmount.toFixed(2)}
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCheckout}
              disabled={loading}
            >
              Proceed to Checkout
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
};
```

### Redux Store Configuration

#### Store Setup
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

import authSlice from './slices/authSlice';
import productSlice from './slices/productSlice';
import cartSlice from './slices/cartSlice';
import orderSlice from './slices/orderSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart'] // Only persist auth and cart
};

const rootReducer = combineReducers({
  auth: authSlice,
  products: productSlice,
  cart: cartSlice,
  orders: orderSlice
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### Cart Slice
```typescript
// store/slices/cartSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { cartAPI } from '../../services/api';

interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  loading: false,
  error: null
};

// Async thunks
export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }: { productId: string; quantity: number }) => {
    const response = await cartAPI.addToCart(productId, quantity);
    return response.data;
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ productId, quantity }: { productId: string; quantity: number }) => {
    const response = await cartAPI.updateCartItem(productId, quantity);
    return response.data;
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (productId: string) => {
    await cartAPI.removeFromCart(productId);
    return productId;
  }
);

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async () => {
    const response = await cartAPI.getCart();
    return response.data;
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.totalItems = 0;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Add to cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.cart.items;
        state.totalAmount = action.payload.cart.totalAmount;
        state.totalItems = action.payload.cart.totalItems;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add item to cart';
      })
      
      // Update cart item
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = action.payload.cart.items;
        state.totalAmount = action.payload.cart.totalAmount;
        state.totalItems = action.payload.cart.totalItems;
      })
      
      // Remove from cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.productId !== action.payload);
        state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
      })
      
      // Fetch cart
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.cart.items;
        state.totalAmount = action.payload.cart.totalAmount;
        state.totalItems = action.payload.cart.totalItems;
      });
  }
});

export const { clearCart, clearError } = cartSlice.actions;
export default cartSlice.reducer;
```

This completes the comprehensive MERN application design with detailed HLD, LLD, service architecture, process flows, deployment best practices, and practical code examples. The design covers all aspects from database schemas to frontend components, providing a complete blueprint for building a scalable Blinkit-like grocery delivery application.
