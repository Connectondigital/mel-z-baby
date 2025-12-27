# Mel'z Baby & Kids - Backend API

Node.js + Express + MySQL (Prisma ORM) backend for the e-commerce platform.

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL/MariaDB server running

### 1. Install Dependencies
```bash
cd /backend
yarn install
```

### 2. Configure Environment
Edit `.env` file with your MySQL credentials:
```
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/melz_baby"
JWT_SECRET="your-secret-key"
PORT=5000
FRONTEND_URL="http://127.0.0.1:8080"
```

### 3. Setup Database
```bash
# Push schema to database
npx prisma db push

# Seed sample data
node prisma/seed.js
```

### 4. Start Server
```bash
yarn dev
# or
node src/server.js
```

Server runs at http://127.0.0.1:5000

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Authentication
- `POST /api/auth/register` - Register new user
  ```json
  { "email": "...", "password": "...", "name": "..." }
  ```
- `POST /api/auth/login` - Login
  ```json
  { "email": "...", "password": "..." }
  ```
- `GET /api/auth/me` - Get current user (requires auth)

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Products
- `GET /api/products` - List products
  - Query params: `?search=&category=&featured=true&page=1&limit=12`
- `GET /api/products/:id` - Get product by ID or slug
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `POST /api/orders` - Create order (auth required)
- `GET /api/orders/my` - Get user's orders (auth required)
- `GET /api/orders` - Get all orders (admin)
- `PUT /api/orders/:id/status` - Update order status (admin)

## Test Credentials

**Admin:**
- Email: admin@melzbaby.com
- Password: admin123

**User:**
- Email: test@example.com
- Password: user123

## Database Schema

### Users
- id, email, password, name, role (USER/ADMIN), phone, address

### Categories
- id, name, slug, description, image, parentId (self-reference)

### Products
- id, name, slug, description, price, salePrice, stock, images (JSON), sizes (JSON), colors (JSON), featured, active, categoryId

### Orders
- id, orderNumber, userId, status, total, shippingName, shippingPhone, shippingAddress, notes

### OrderItems
- id, orderId, productId, quantity, price, size, color

## Frontend Integration

The frontend uses `/frontend/assets/api.js` which automatically:
- Fetches products from API
- Renders product cards
- Loads product details
- Handles category filtering

API base URL can be configured via `window.MELZ_API_URL` or defaults to `http://127.0.0.1:5000/api`.
