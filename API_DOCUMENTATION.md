# Electronics Retail ERP API Documentation

Base URL:

```text
http://localhost:5000
```

API base path:

```text
/api
```

Protected endpoints require a JWT bearer token:

```http
Authorization: Bearer <token>
```

Roles used by the API:

```text
Admin
Manager
Salesperson
```

Common error responses:

```json
{
  "message": "Error message"
}
```

Validation errors use:

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Validation message",
      "path": "fieldName",
      "location": "body"
    }
  ]
}
```

## System

### Get API Status

```http
GET /
```

Auth: public

### Health Check

```http
GET /api/health
```

Auth: public

Returns server status, environment, uptime, and timestamp.

## Auth

Base path:

```text
/api/auth
```

### Register

```http
POST /api/auth/register
```

Auth: public

Body:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "secret123",
  "role": "Admin"
}
```

Rules:

- `name` is required.
- `email` must be valid.
- `password` must be at least 6 characters.
- `role` is optional and must be `Admin`, `Manager`, or `Salesperson`.

### Login

```http
POST /api/auth/login
```

Auth: public

Body:

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Returns the authenticated user and JWT token.

### Logout

```http
POST /api/auth/logout
```

Auth: public

## Users

Base path:

```text
/api/users
```

All user endpoints require `Admin`.

### List Users

```http
GET /api/users
```

### Get User By ID

```http
GET /api/users/:id
```

Params:

- `id`: MongoDB ObjectId.

### Create User

```http
POST /api/users
```

Body:

```json
{
  "name": "Manager User",
  "email": "manager@example.com",
  "password": "secret123",
  "role": "Manager",
  "isActive": true
}
```

Rules:

- `name`, `email`, `password`, and `role` are required.
- `role` must be `Admin`, `Manager`, or `Salesperson`.
- `isActive` is optional boolean.

### Update User

```http
PUT /api/users/:id
```

Body fields are optional:

```json
{
  "name": "Updated User",
  "email": "updated@example.com",
  "password": "newsecret123",
  "role": "Salesperson",
  "isActive": false
}
```

### Delete User

```http
DELETE /api/users/:id
```

## Products

Base path:

```text
/api/products
```

Read access: `Admin`, `Manager`, `Salesperson`

Write access: `Admin`, `Manager`

### Categories

#### List Categories

```http
GET /api/products/categories
```

#### Create Category

```http
POST /api/products/categories
```

Body:

```json
{
  "name": "Laptop",
  "description": "Portable computers"
}
```

#### Update Category

```http
PUT /api/products/categories/:id
```

Body fields are optional:

```json
{
  "name": "Updated Category",
  "description": "Updated description"
}
```

#### Delete Category

```http
DELETE /api/products/categories/:id
```

### Brands

#### List Brands

```http
GET /api/products/brands
```

#### Create Brand

```http
POST /api/products/brands
```

Body:

```json
{
  "name": "Dell"
}
```

#### Update Brand

```http
PUT /api/products/brands/:id
```

Body:

```json
{
  "name": "Updated Brand"
}
```

#### Delete Brand

```http
DELETE /api/products/brands/:id
```

### Product Records

#### List Products

```http
GET /api/products
```

Optional query params:

- `categoryId`
- `brandId`
- `search`

Example:

```http
GET /api/products?categoryId=<categoryId>&brandId=<brandId>&search=laptop
```

#### Get Product By ID

```http
GET /api/products/:id
```

#### Create Product

```http
POST /api/products
```

Body:

```json
{
  "name": "Dell Inspiron 15",
  "categoryId": "<categoryId>",
  "brandId": "<brandId>",
  "description": "15 inch laptop",
  "image": "https://example.com/image.jpg",
  "variants": [
    {
      "ram": "8GB",
      "storage": "512GB SSD",
      "color": "Black",
      "sku": "DELL-INSP-8-512-BLK",
      "sellingPrice": 750,
      "costPrice": 620
    }
  ]
}
```

Rules:

- Product `name`, `categoryId`, and `brandId` are required.
- Variant `sku`, `sellingPrice`, and `costPrice` are required when variants are provided.
- SKU must be unique.

#### Update Product

```http
PUT /api/products/:id
```

Body fields are optional. If `variants` is provided, each variant must include valid pricing and SKU fields.

#### Delete Product

```http
DELETE /api/products/:id
```

## Inventory

Base path:

```text
/api/inventory
```

### List Inventory

```http
GET /api/inventory
```

Roles: `Admin`, `Manager`, `Salesperson`

### Stock In

```http
POST /api/inventory/stock-in
```

Roles: `Admin`, `Manager`

Body:

```json
{
  "variantId": "<variantId>",
  "quantity": 10,
  "type": "PURCHASE",
  "referenceId": "<optionalReferenceId>",
  "notes": "Initial stock"
}
```

Rules:

- `variantId` is required.
- `quantity` must be at least 1.
- `type` is optional and must be `PURCHASE`, `RETURN`, or `ADJUSTMENT`.
- `referenceId` is optional MongoDB ObjectId.

### Stock Out

```http
POST /api/inventory/stock-out
```

Roles: `Admin`, `Manager`, `Salesperson`

Body:

```json
{
  "variantId": "<variantId>",
  "quantity": 2,
  "type": "SALE",
  "referenceId": "<optionalReferenceId>",
  "notes": "Manual sale adjustment"
}
```

Rules:

- `type` is optional and must be `SALE` or `ADJUSTMENT`.
- Inventory must have enough quantity.

## Suppliers

Base path:

```text
/api/suppliers
```

Read access: `Admin`, `Manager`, `Salesperson`

Write access: `Admin`, `Manager`

### List Suppliers

```http
GET /api/suppliers
```

### Create Supplier

```http
POST /api/suppliers
```

Body:

```json
{
  "name": "Tech Supplier Ltd",
  "phone": "01700000000",
  "email": "supplier@example.com",
  "address": "Dhaka"
}
```

Rules:

- `name` is required and must be unique.
- `phone` is required.
- `email` is optional but must be valid when provided.

### Update Supplier

```http
PUT /api/suppliers/:id
```

Body fields are optional:

```json
{
  "name": "Updated Supplier",
  "phone": "01800000000",
  "email": "updated@example.com",
  "address": "Chittagong"
}
```

### Delete Supplier

```http
DELETE /api/suppliers/:id
```

## Purchase Orders

Base path:

```text
/api/purchase-orders
```

Read access: `Admin`, `Manager`, `Salesperson`

Write access: `Admin`, `Manager`

### List Purchase Orders

```http
GET /api/purchase-orders
```

### Get Purchase Order By ID

```http
GET /api/purchase-orders/:id
```

### Create Purchase Order

```http
POST /api/purchase-orders
```

Body:

```json
{
  "supplierId": "<supplierId>",
  "status": "Ordered",
  "items": [
    {
      "variantId": "<variantId>",
      "quantity": 5,
      "unitCost": 500
    }
  ]
}
```

Rules:

- `supplierId` is required.
- `status` is optional and must be `Draft` or `Ordered`.
- `items` must contain at least one item.
- Each item requires `variantId`, `quantity`, and `unitCost`.
- `totalCost` is calculated automatically.

### Update Purchase Order

```http
PUT /api/purchase-orders/:id
```

Body fields are optional:

```json
{
  "supplierId": "<supplierId>",
  "status": "Cancelled",
  "items": [
    {
      "variantId": "<variantId>",
      "quantity": 3,
      "unitCost": 480
    }
  ]
}
```

Rules:

- `status` must be `Draft`, `Ordered`, or `Cancelled`.

### Receive Purchase Order

```http
PATCH /api/purchase-orders/:id/receive
```

Receiving a purchase order:

- Changes status to `Received`.
- Increases inventory quantities.
- Creates `PURCHASE` inventory transaction records.
- Stores the purchase order id as the transaction `referenceId`.
- Cannot be done more than once.
- Cannot be done for cancelled purchase orders.

## Customers

Base path:

```text
/api/customers
```

Access: `Admin`, `Manager`, `Salesperson`

### List Customers

```http
GET /api/customers
```

Optional query params:

- `search`

### Get Customer By ID

```http
GET /api/customers/:id
```

### Create Customer

```http
POST /api/customers
```

Body:

```json
{
  "name": "Customer Name",
  "phone": "01700000000",
  "email": "customer@example.com",
  "address": "Dhaka"
}
```

Rules:

- `name` and `phone` are required.
- `email` is optional but must be valid when provided.

### Update Customer

```http
PUT /api/customers/:id
```

Body fields are optional.

## Sales

Base path:

```text
/api/sales
```

Access: `Admin`, `Manager`, `Salesperson`

### List Sales

```http
GET /api/sales
```

### Get Sale By ID

```http
GET /api/sales/:id
```

### Create Sale

```http
POST /api/sales
```

Body:

```json
{
  "customerId": "<customerId>",
  "items": [
    {
      "variantId": "<variantId>",
      "quantity": 1,
      "unitPrice": 750
    }
  ],
  "discount": 50,
  "paymentStatus": "Paid"
}
```

Rules:

- `customerId` is required.
- `items` must contain at least one item.
- Each item requires `variantId` and `quantity`.
- `unitPrice` is optional. If omitted, the variant selling price is used.
- `discount` is optional and cannot exceed subtotal.
- `paymentStatus` is optional and must be `Pending`, `Paid`, or `Partial`.
- Creating a sale decreases inventory and creates `SALE` inventory transaction records.

### Process Sale Return

```http
POST /api/sales/:id/returns
```

Body:

```json
{
  "items": [
    {
      "variantId": "<variantId>",
      "quantity": 1
    }
  ],
  "notes": "Customer returned item"
}
```

Rules:

- Returned variants must belong to the sale.
- Return quantity cannot exceed remaining returnable quantity.
- Inventory is increased.
- `RETURN` inventory transaction records are created.

## Budgets

Base path:

```text
/api/budgets
```

Access: `Admin`, `Manager`

Expense categories:

```text
Rent
Salary
Utilities
Internet
Marketing
Equipment
Miscellaneous
```

### List Budgets

```http
GET /api/budgets
```

Optional query params:

- `month`: 1 to 12.
- `year`: 2000 or later.
- `category`: one of the expense categories.

Example:

```http
GET /api/budgets?month=6&year=2026&category=Rent
```

Response includes budget usage fields:

- `allocatedAmount`
- `spentAmount`
- `remainingAmount`
- `utilizationPercent`
- `isOverBudget`

### Create Budget

```http
POST /api/budgets
```

Body:

```json
{
  "month": 6,
  "year": 2026,
  "category": "Rent",
  "allocatedAmount": 1000
}
```

Rules:

- `month`, `year`, `category`, and `allocatedAmount` are required.
- `allocatedAmount` must be positive.
- Only one budget can exist for the same month, year, and category.

### Update Budget

```http
PUT /api/budgets/:id
```

Body fields are optional:

```json
{
  "month": 7,
  "year": 2026,
  "category": "Marketing",
  "allocatedAmount": 1500
}
```

## Expenses

Base path:

```text
/api/expenses
```

Access: `Admin`, `Manager`

### List Expenses

```http
GET /api/expenses
```

Optional query params:

- `category`: one of the expense categories.
- `month`: 1 to 12.
- `year`: 2000 or later.
- `startDate`: ISO date.
- `endDate`: ISO date.

Examples:

```http
GET /api/expenses?month=6&year=2026
GET /api/expenses?startDate=2026-01-01&endDate=2026-12-31
```

### Create Expense

```http
POST /api/expenses
```

Body:

```json
{
  "category": "Rent",
  "amount": 800,
  "description": "June shop rent",
  "expenseDate": "2026-06-01"
}
```

Rules:

- `category` and `amount` are required.
- `amount` must be positive.
- `expenseDate` is optional. If omitted, current date is used.
- `createdBy` is set from the authenticated user.

### Update Expense

```http
PUT /api/expenses/:id
```

Body fields are optional.

### Delete Expense

```http
DELETE /api/expenses/:id
```

## Analytics

Base path:

```text
/api/analytics
```

Access: `Admin`, `Manager`

Common optional query params:

- `startDate`: ISO date.
- `endDate`: ISO date. Must be on or after `startDate` when both are provided.
- `limit`: 1 to 100.

Inventory analytics also supports:

- `lowStockThreshold`: zero or greater.

### Dashboard Analytics

```http
GET /api/analytics/dashboard
```

Optional query params:

- `limit`
- `lowStockThreshold`

Returns:

- Overview cards: total revenue, orders, customers, inventory value, expenses, estimated profit.
- Sales metrics: revenue today, week, month, year.
- Growth metrics: revenue, sales, customer, annual revenue growth percentages.
- Inventory metrics: inventory value, retail value, low-stock count.
- Customer metrics: total customers, new customers, top customers.
- Profit metrics.
- Product performance.
- Low-stock products.

### Sales Analytics

```http
GET /api/analytics/sales
```

Example:

```http
GET /api/analytics/sales?startDate=2026-01-01&endDate=2026-12-31&limit=10
```

Returns:

- Summary revenue/order metrics.
- Daily, weekly, monthly, and annual sales trends.
- Best-selling, worst-selling, and most profitable products.
- Category performance.

### Inventory Analytics

```http
GET /api/analytics/inventory
```

Example:

```http
GET /api/analytics/inventory?startDate=2026-01-01&endDate=2026-12-31&lowStockThreshold=5&limit=10
```

Returns:

- Inventory summary.
- Low-stock products.
- Fast-moving products.
- Slow-moving products.

### Customer Analytics

```http
GET /api/analytics/customers
```

Example:

```http
GET /api/analytics/customers?startDate=2026-01-01&endDate=2026-12-31&limit=10
```

Returns:

- Total customers.
- New customers in range.
- Returning customers in range.
- Top customers by spending.

### Profit Analytics

```http
GET /api/analytics/profit
```

Example:

```http
GET /api/analytics/profit?startDate=2026-01-01&endDate=2026-12-31
```

Returns:

- Revenue.
- Gross revenue.
- Returned amount.
- Expenses.
- Estimated profit.
- Profit margin percentage.
- Expenses by category.

Current formula:

```text
Estimated Profit = Revenue - Operating Expenses
```

Purchase orders are tracked separately from expenses. For more detailed accounting, future analytics can add cost of goods sold:

```text
Gross Profit = Revenue - Cost of Goods Sold
Net Profit = Gross Profit - Operating Expenses
```
