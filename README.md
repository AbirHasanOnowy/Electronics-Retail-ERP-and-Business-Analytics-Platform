# Electronics Retail ERP

This project is a backend API for a small electronics retail business. It helps manage products, inventory, suppliers, purchase orders, customers, sales, expenses, budgets, and business analytics.

In simple terms, it is software for tracking what a shop buys, sells, stores, spends, and earns.

## What This Project Does

- Manages users with roles like Admin, Manager, and Salesperson.
- Stores products, brands, categories, and product variants.
- Tracks inventory stock in and stock out.
- Manages suppliers and purchase orders.
- Records customer information.
- Creates sales and handles product returns.
- Tracks business expenses and monthly budgets.
- Provides analytics for revenue, customers, inventory, expenses, and estimated profit.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Express Validator

## Main Modules

### Authentication

Users can register, log in, and receive a JWT token. Protected APIs require this token.

### User Management

Admins can create, update, deactivate, and delete users.

### Product Management

Managers can create product categories, brands, products, and variants. A product variant can represent something like:

```text
Dell Laptop / 8GB RAM / 512GB SSD / Black
```

### Inventory Management

Inventory keeps track of how many units are available for each product variant. Stock changes are saved as inventory transactions.

### Supplier and Purchase Orders

Suppliers are the companies the business buys products from. Purchase orders record product purchases. When a purchase order is received, inventory automatically increases.

### Customers and Sales

Sales are linked to customers and product variants. When a sale is created, inventory decreases automatically. Returned items can be processed and added back to inventory.

### Budgets and Expenses

Budgets define planned monthly spending for categories like rent, salary, utilities, marketing, and equipment. Expenses record actual spending.

### Analytics

Analytics gives business summaries such as:

- Revenue today, this week, this month, and this year.
- Total orders.
- Total customers.
- Inventory value.
- Low-stock products.
- Fast-moving and slow-moving products.
- Top customers.
- Expenses.
- Estimated profit.

Current profit formula:

```text
Estimated Profit = Revenue - Operating Expenses
```

Purchase orders are tracked separately from expenses, so inventory purchase cost is not directly counted as an operating expense.

## Project Structure

```text
Server/
  config/
    db.js
  middleware/
    authMiddleware.js
  modules/
    analytics/
    auth/
    budgets/
    customers/
    expenses/
    inventory/
    products/
    purchaseOrders/
    sales/
    suppliers/
    users/
  server.js
```

Each module usually contains:

- A model file for the database schema.
- A controller file for business logic.
- A router file for API routes.
- A request file for manual API testing.

## Getting Started

### 1. Install Dependencies

```bash
cd Server
npm install
```

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then update `.env` if needed:

```text
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/ERM_DB
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
```

### 3. Start MongoDB

Make sure MongoDB is running locally, or update `MONGO_URI` to use your MongoDB connection string.

### 4. Run the Server

Development mode:

```bash
npm run dev
```

Production/start mode:

```bash
npm start
```

The API will run at:

```text
http://localhost:5000
```

## Authentication

Most endpoints need a JWT token. First log in:

```http
POST /api/auth/login
```

Then send the token with protected requests:

```http
Authorization: Bearer <token>
```

## API Documentation

Full API details are available here:

[API_DOCUMENTATION.md](API_DOCUMENTATION.md)

That file includes all endpoints, request bodies, query parameters, roles, and important rules.

## Current Status

This project currently focuses on the backend API. It is suitable for learning, portfolio work, and building a frontend dashboard on top of it.

Possible future improvements:

- Frontend dashboard with charts.
- More detailed profit calculation using cost of goods sold.
- Invoice PDF generation.
- Barcode scanning.
- Multi-branch support.
- Advanced accounting reports.
