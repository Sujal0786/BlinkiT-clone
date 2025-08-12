# 🛒 BlinkIt Clone - Full Stack E-commerce Application

A complete MERN stack e-commerce application inspired by BlinkIt (formerly Grofers) - an online grocery delivery platform.

## 🚀 Features

- **User Authentication** - Register, Login, Email Verification
- **Admin Panel** - Manage categories, subcategories, and products
- **Product Management** - CRUD operations for products
- **Shopping Cart** - Add/remove items, persistent cart
- **Payment Integration** - Stripe payment gateway + Cash on Delivery
- **Order Management** - Track orders and payment status
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Image Upload** - Cloudinary integration for product images
- **Search & Filter** - Product search and category filtering

## 🏗️ Tech Stack

### Frontend
- **React 18** with Vite
- **Redux Toolkit** for state management
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Stripe.js** for payments

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Cloudinary** for image storage
- **Stripe** for payment processing
- **Resend** for email notifications

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (local or MongoDB Atlas)
- **Git**
- **Stripe Account** (for payments)
- **Cloudinary Account** (for image uploads)

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sujal0786/BlinkiT-clone.git
cd BlinkIt-Clone-Full-Stack-Ecommerce
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

**Configure Backend Environment Variables (.env):**

```env
# Database
MONGODB_URI=mongodb://localhost:27017/blinkit

# Frontend URL
FRONTEND_URL=http://localhost:5173

# JWT Secrets
SECRET_KEY_ACCESS_TOKEN=your_access_token_secret
SECRET_KEY_REFRESH_TOKEN=your_refresh_token_secret

# Cloudinary Configuration
CLODINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLODINARY_API_KEY=your_cloudinary_api_key
CLODINARY_API_SECRET_KEY=your_cloudinary_secret_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_ENPOINT_WEBHOOK_SECRET_KEY=whsec_your_webhook_secret

# Email Service
RESEND_API=your_resend_api_key
```

### 3. Frontend Setup

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Create .env file
touch .env
```

**Configure Frontend Environment Variables (.env):**

```env
# Backend API URL
VITE_API_URL=http://localhost:8080

# Stripe Public Key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key
```

### 4. Start MongoDB

**For Local MongoDB:**
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

**For MongoDB Atlas:**
- Update `MONGODB_URI` in backend `.env` with your Atlas connection string

### 5. Run the Application

**Start Backend Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:8080
```

**Start Frontend (in new terminal):**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

## 👑 Admin Setup

### Make User Admin

After registering a user account, you need to make it an admin to access the admin panel:

1. **Update the admin script:**
   ```bash
   cd server
   # Edit makeAdmin.js and replace 'sujal@example.com' with your email
   ```

2. **Run the admin script:**
   ```bash
   node makeAdmin.js
   ```

3. **Verify admin access:**
   - Refresh your browser
   - You should see "(Admin)" next to your name in the account dropdown

## 🎛️ Admin Panel Guide

### Accessing Admin Panel

Once you have admin privileges, access the admin panel through:

- **Categories**: `http://localhost:5173/dashboard/category`
- **Subcategories**: `http://localhost:5173/dashboard/subcategory`
- **Upload Products**: `http://localhost:5173/dashboard/upload-product`
- **Manage Products**: `http://localhost:5173/dashboard/product`

### Adding Data (Step by Step)

#### 1. Add Categories

1. Go to `http://localhost:5173/dashboard/category`
2. Click "Add Category"
3. Enter category details:
   - **Name**: e.g., "Fruits & Vegetables"
   - **Image**: Upload category image
4. Click "Save"

**Suggested Categories:**
- Fruits & Vegetables
- Dairy & Bakery
- Beverages
- Snacks & Branded Foods
- Personal Care
- Home & Kitchen

#### 2. Add Subcategories

1. Go to `http://localhost:5173/dashboard/subcategory`
2. Click "Add Subcategory"
3. Enter subcategory details:
   - **Name**: e.g., "Fresh Fruits"
   - **Category**: Select parent category
   - **Image**: Upload subcategory image
4. Click "Save"

**Example Subcategories:**
- **Fruits & Vegetables**: Fresh Fruits, Fresh Vegetables, Exotic Fruits
- **Dairy & Bakery**: Milk, Bread, Cheese, Yogurt
- **Beverages**: Cold Drinks, Juices, Tea & Coffee

#### 3. Add Products

1. Go to `http://localhost:5173/dashboard/upload-product`
2. Fill product details:
   - **Name**: Product name
   - **Category**: Select category
   - **Subcategory**: Select subcategory
   - **Images**: Upload multiple product images
   - **Price**: Set price in rupees
   - **Discount**: Set discount percentage (optional)
   - **Stock**: Set available quantity
   - **Unit**: e.g., "1 kg", "500g", "1 piece"
   - **Description**: Product description
   - **More Details**: Additional product information
3. Click "Upload Product"

#### 4. Manage Products

1. Go to `http://localhost:5173/dashboard/product`
2. View all products
3. Edit or delete products as needed

## 🛍️ Customer Flow

### Shopping Experience

1. **Browse Products**
   - Visit homepage to see categories
   - Click categories to view products
   - Use search to find specific items

2. **Add to Cart**
   - Click "Add to Cart" on product cards
   - Adjust quantities in cart

3. **Checkout Process**
   - Click cart icon to review items
   - Proceed to checkout
   - Add delivery address
   - Choose payment method:
     - **Cash on Delivery**
     - **Online Payment** (Stripe)

4. **Order Tracking**
   - View order history in account section
   - Track order status

## 💳 Payment Setup

### Stripe Configuration

1. **Create Stripe Account**: [stripe.com](https://stripe.com)
2. **Get API Keys**: Dashboard → Developers → API Keys
3. **Add Keys to Environment Files**:
   - Frontend: `VITE_STRIPE_PUBLIC_KEY=pk_test_...`
   - Backend: `STRIPE_SECRET_KEY=sk_test_...`
4. **Setup Webhook**: Configure webhook endpoint at `/api/order/webhook`

### Test Payment

Use Stripe test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## 🔧 API Endpoints

### Authentication
- `POST /api/user/register` - User registration
- `POST /api/user/login` - User login
- `GET /api/user/user-details` - Get user details

### Products
- `GET /api/category/get` - Get all categories
- `POST /api/product/get` - Get products with filters
- `POST /api/product/create` - Create product (Admin)

### Cart & Orders
- `GET /api/cart/get` - Get user cart
- `POST /api/cart/add` - Add to cart
- `POST /api/order/checkout` - Stripe checkout
- `POST /api/order/cash-on-delivery` - COD order

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in deployment platform

### Backend (Railway/Heroku)
1. Push code to Git repository
2. Connect to deployment platform
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create MongoDB Atlas cluster
2. Update `MONGODB_URI` in environment variables
3. Whitelist deployment server IP

## 🐛 Troubleshooting

### Common Issues

1. **Frontend not connecting to backend**
   - Check `VITE_API_URL` in client `.env`
   - Ensure backend is running on correct port

2. **401 Unauthorized errors**
   - Normal for unauthenticated users
   - Login to access protected routes

3. **Stripe errors**
   - Check Stripe keys are correctly set
   - Disable ad blockers that might block Stripe

4. **Image upload issues**
   - Verify Cloudinary credentials
   - Check file size limits

5. **MongoDB connection issues**
   - Ensure MongoDB is running
   - Check connection string format

## 📝 Scripts

### Backend Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
node makeAdmin.js  # Make user admin
```

### Frontend Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by BlinkIt (Grofers)
- Built with MERN stack
- UI components styled with Tailwind CSS
- Payment processing by Stripe

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check troubleshooting section above

---

**Happy Shopping! 🛒✨**
