# Case Study: Electronics Retail ERP Backend

## Project Summary

This project is a backend API for an electronics retail ERP system. The goal was to design a modular server that can manage the daily operations of a small or medium electronics shop.

The system supports:

- User authentication and role-based access.
- Product, category, brand, and variant management.
- Inventory tracking.
- Supplier and purchase order workflows.
- Customer and sales records.
- Sale returns.
- Budget and expense tracking.
- Business analytics and reporting.

The main challenge was not just creating CRUD APIs. The harder part was connecting business processes correctly so that one action updates related parts of the system in a reliable way.

## Business Problem

An electronics retailer needs to know:

- What products are available.
- How much stock exists for each product variant.
- Which suppliers provide inventory.
- Which customers are buying.
- How much revenue the business is generating.
- How much the business is spending.
- Whether inventory is moving quickly or slowly.
- Whether the business is growing.

A simple product list is not enough for this kind of business. The system needs connected modules that work together.

For example:

- Receiving a purchase order should increase inventory.
- Creating a sale should decrease inventory.
- Returning a sale item should increase inventory again.
- Recording expenses should affect budget usage.
- Analytics should summarize sales, customers, inventory, expenses, and profit.

## Key Design Challenges

## 1. Modular Architecture

The backend was split into separate modules:

```text
auth
users
products
inventory
suppliers
purchaseOrders
customers
sales
budgets
expenses
analytics
```

Each module has its own router, controller, and model where needed.

This made the system easier to maintain because each business area has a clear place in the codebase.

Challenge:

If modules are too isolated, business workflows become difficult to connect. If modules are too tightly connected, the code becomes hard to change.

Solution:

Controllers import only the models they need for real business actions. For example, the sales controller uses inventory models because creating a sale must update inventory.

## 2. Role-Based Access Control

The system supports three roles:

```text
Admin
Manager
Salesperson
```

Different roles have different permissions.

Examples:

- Admin can manage users.
- Manager can manage products, inventory, suppliers, budgets, expenses, and analytics.
- Salesperson can create sales, view customers, and view inventory.

Challenge:

Every endpoint needs the right balance of access. Too much access is risky. Too little access makes the system unusable.

Solution:

Protected routers use authentication middleware first, then role authorization middleware. This keeps access control consistent across modules.

## 3. Product Variants

Electronics products often have multiple versions.

Example:

```text
Laptop
- 8GB RAM / 256GB SSD
- 16GB RAM / 512GB SSD
```

Each variant can have its own SKU, selling price, and cost price.

Challenge:

Inventory and sales cannot track only the main product. They need to track the exact variant being bought or sold.

Solution:

The system uses a separate `ProductVariant` model. Inventory, sales, and purchase orders reference product variants instead of only referencing products.

This makes stock tracking more accurate.

## 4. Inventory Consistency

Inventory is one of the most sensitive parts of the system.

Several actions affect inventory:

- Manual stock in.
- Manual stock out.
- Receiving purchase orders.
- Creating sales.
- Processing returns.

Challenge:

Inventory quantity must not become incorrect. A sale should not be created if there is not enough stock. A purchase order should not be received twice.

Solution:

Inventory updates are handled inside controlled workflows. The system checks stock before reducing inventory and records inventory transactions for audit history.

For sales and purchase order receiving, MongoDB sessions and transactions are used so related database changes succeed together.

Example:

When a sale is created:

1. The customer is verified.
2. Product variants are verified.
3. Inventory availability is checked.
4. The sale is created.
5. Inventory is reduced.
6. A `SALE` inventory transaction is recorded.

If any step fails, the operation is rolled back.

## 5. Purchase Order Workflow

Purchase orders are used to replenish inventory.

Statuses include:

```text
Draft
Ordered
Received
Cancelled
```

Challenge:

Receiving a purchase order is not just a status update. It must also increase inventory and create inventory transaction records.

Solution:

The receive endpoint performs a full workflow:

- Confirms the purchase order exists.
- Prevents receiving cancelled or already received orders.
- Updates the status to `Received`.
- Increases inventory for every item.
- Creates `PURCHASE` inventory transactions.
- Stores the purchase order id as the transaction reference.

This creates a traceable connection between supplier purchases and stock changes.

## 6. Sales and Returns

Sales affect both revenue and inventory.

Challenge:

A sale can contain multiple items. Each item may have a different variant and price. Returns also need to be handled carefully so users cannot return more than was sold.

Solution:

The sale model stores:

- Invoice number.
- Customer.
- Salesperson.
- Sale items.
- Subtotal.
- Discount.
- Total.
- Payment status.
- Return history.

When a return is processed:

- The system verifies the item was part of the sale.
- It checks the remaining returnable quantity.
- It updates returned quantities.
- It increases inventory.
- It creates `RETURN` inventory transaction records.

This keeps sale history and inventory history aligned.

## 7. Budget and Expense Tracking

Budgets are planned spending. Expenses are actual spending.

Challenge:

The business needs to know not only how much it spent, but whether spending is within budget.

Solution:

Budgets are created by month, year, and category. Expenses are recorded with category, amount, date, and creator.

When budgets are fetched, the system calculates:

- Allocated amount.
- Spent amount.
- Remaining amount.
- Utilization percentage.
- Whether the budget is overused.

This turns raw expense records into useful budget information.

## 8. Separating Purchase Orders From Expenses

A design question was whether purchase orders should be counted as expenses.

Challenge:

Inventory purchases and operating expenses are different business concepts.

If purchase orders are counted directly as expenses, profit can become misleading because inventory might be purchased now but sold later.

Solution:

The system treats them separately:

- Purchase orders represent buying inventory.
- Expenses represent operating costs like rent, salary, utilities, marketing, and equipment.

Current analytics use:

```text
Estimated Profit = Revenue - Operating Expenses
```

This is simple and useful for an early version.

A future version can add cost of goods sold:

```text
Gross Profit = Revenue - Cost of Goods Sold
Net Profit = Gross Profit - Operating Expenses
```

## 9. Analytics and Reporting

The analytics module was designed to help users understand business growth.

It provides:

- Dashboard overview.
- Sales analytics.
- Inventory analytics.
- Customer analytics.
- Profit analytics.

Challenge:

Analytics must summarize data from many modules without duplicating business data.

Solution:

Analytics uses MongoDB aggregation queries across existing collections such as sales, customers, inventory, product variants, and expenses.

The dashboard includes:

- Revenue today, this week, this month, and this year.
- Revenue growth.
- Sales growth.
- Customer growth.
- Inventory value.
- Low-stock products.
- Fast-moving products.
- Slow-moving products.
- Top customers.
- Expenses.
- Estimated profit.

This gives the business owner a practical overview of performance.

## 10. Validation and Error Handling

Each router validates request data before it reaches the controller.

Examples:

- MongoDB ids must be valid ObjectIds.
- Amounts must be positive.
- Quantities must be at least 1.
- Dates must be valid ISO dates.
- Roles must match allowed values.
- Payment statuses must match allowed values.

Challenge:

Invalid input can cause confusing bugs or bad data.

Solution:

The project uses `express-validator` to reject invalid requests early with clear validation errors.

## Important Tradeoffs

## Simple Profit vs Full Accounting

The current profit analytics are simple:

```text
Estimated Profit = Revenue - Operating Expenses
```

This is good for a first ERP version, but it is not full accounting.

A more advanced version should store cost at the time of sale and calculate cost of goods sold.

## Backend First

The project currently focuses on the backend API. This made it possible to build the business logic and database relationships first.

A frontend dashboard can now be built on top of the API.

## Current Strengths

- Clear modular structure.
- Role-based access control.
- Product variant support.
- Inventory transaction history.
- Purchase order receiving workflow.
- Sale and return workflow.
- Budget utilization tracking.
- Analytics across sales, inventory, customers, expenses, and profit.
- API documentation and request files for testing.

## Future Improvements

The system can be improved with:

- Cost of goods sold analytics.
- Profit by product and category.
- Invoice PDF generation.
- Payment tracking improvements.
- Barcode scanning.
- Multi-branch inventory.
- Frontend dashboard with charts.
- Automated tests.
- More advanced accounting reports.

## Conclusion

This project demonstrates how a retail ERP backend can be designed around real business workflows instead of isolated CRUD operations.

The most important implementation challenge was keeping related modules connected safely:

- Sales update inventory.
- Returns restore inventory.
- Purchase orders replenish inventory.
- Expenses affect budget usage.
- Analytics summarize the whole business.

The result is a practical backend foundation for an electronics retail management system.
