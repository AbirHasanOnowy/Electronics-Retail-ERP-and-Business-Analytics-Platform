import Customer from "../customers/CustomerModel.js";
import Expense from "../expenses/ExpenseModel.js";
import { Inventory, InventoryTransaction } from "../inventory/InventoryModel.js";
import { Category, Product, ProductVariant } from "../products/ProductModel.js";
import Sale from "../sales/SaleModel.js";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const getStartOfDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getStartOfWeek = (date) => {
  const startOfDay = getStartOfDay(date);
  const day = startOfDay.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  return new Date(startOfDay.getTime() - daysSinceMonday * MILLIS_PER_DAY);
};

const getStartOfMonth = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const getStartOfYear = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

const addDays = (date, days) =>
  new Date(date.getTime() + days * MILLIS_PER_DAY);

const addMonths = (date, months) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()),
  );

const addYears = (date, years) =>
  new Date(
    Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()),
  );

const getDateRange = (query = {}) => {
  const now = new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : getStartOfYear(now);
  const endDate = query.endDate
    ? addDays(new Date(query.endDate), 1)
    : addDays(getStartOfDay(now), 1);

  return { startDate, endDate };
};

const getLimit = (queryLimit, fallback = 10) => Number(queryLimit || fallback);

const roundMoney = (value) => Number((value || 0).toFixed(2));

const roundPercent = (value) => Number((value || 0).toFixed(2));

const getGrowthPercent = (current, previous) => {
  if (!previous) {
    return current ? 100 : 0;
  }

  return roundPercent(((current - previous) / previous) * 100);
};

const buildSaleDateMatch = (startDate, endDate) => ({
  createdAt: { $gte: startDate, $lt: endDate },
});

const netRevenueExpression = {
  $subtract: [
    "$total",
    {
      $reduce: {
        input: { $ifNull: ["$returnHistory", []] },
        initialValue: 0,
        in: { $add: ["$$value", "$$this.totalAmount"] },
      },
    },
  ],
};

const getSalesSummary = async (startDate, endDate) => {
  const [summary = {}] = await Sale.aggregate([
    { $match: buildSaleDateMatch(startDate, endDate) },
    {
      $addFields: {
        netRevenue: netRevenueExpression,
        itemCount: { $sum: "$items.quantity" },
        returnedAmount: {
          $reduce: {
            input: { $ifNull: ["$returnHistory", []] },
            initialValue: 0,
            in: { $add: ["$$value", "$$this.totalAmount"] },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$netRevenue" },
        grossRevenue: { $sum: "$total" },
        returnedAmount: { $sum: "$returnedAmount" },
        orders: { $sum: 1 },
        itemsSold: { $sum: "$itemCount" },
        averageOrderValue: { $avg: "$netRevenue" },
      },
    },
  ]);

  return {
    revenue: roundMoney(summary.revenue),
    grossRevenue: roundMoney(summary.grossRevenue),
    returnedAmount: roundMoney(summary.returnedAmount),
    orders: summary.orders || 0,
    itemsSold: summary.itemsSold || 0,
    averageOrderValue: roundMoney(summary.averageOrderValue),
  };
};

const getExpenseTotal = async (startDate, endDate) => {
  const [summary = {}] = await Expense.aggregate([
    { $match: { expenseDate: { $gte: startDate, $lt: endDate } } },
    { $group: { _id: null, expenses: { $sum: "$amount" } } },
  ]);

  return roundMoney(summary.expenses);
};

const getCustomerCount = (startDate, endDate) =>
  Customer.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } });

const getInventorySummary = async (lowStockThreshold = 5) => {
  const [summary = {}] = await Inventory.aggregate([
    {
      $lookup: {
        from: ProductVariant.collection.name,
        localField: "variantId",
        foreignField: "_id",
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    {
      $group: {
        _id: null,
        variantsInStock: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        inventoryValue: {
          $sum: { $multiply: ["$quantity", "$variant.costPrice"] },
        },
        retailValue: {
          $sum: { $multiply: ["$quantity", "$variant.sellingPrice"] },
        },
        lowStockProducts: {
          $sum: {
            $cond: [{ $lte: ["$quantity", lowStockThreshold] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    variantsInStock: summary.variantsInStock || 0,
    totalQuantity: summary.totalQuantity || 0,
    inventoryValue: roundMoney(summary.inventoryValue),
    retailValue: roundMoney(summary.retailValue),
    lowStockProducts: summary.lowStockProducts || 0,
  };
};

const productLookupStages = [
  {
    $lookup: {
      from: ProductVariant.collection.name,
      localField: "_id",
      foreignField: "_id",
      as: "variant",
    },
  },
  { $unwind: "$variant" },
  {
    $lookup: {
      from: Product.collection.name,
      localField: "variant.productId",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
];

const productProjection = {
  _id: 0,
  variantId: "$_id",
  productId: "$product._id",
  name: "$product.name",
  sku: "$variant.sku",
  quantitySold: 1,
  revenue: { $round: ["$revenue", 2] },
  profit: { $round: ["$profit", 2] },
};

const getProductPerformance = async (startDate, endDate, limit = 10) => {
  const baseStages = [
    { $match: buildSaleDateMatch(startDate, endDate) },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.variantId",
        quantitySold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.totalPrice" },
      },
    },
    ...productLookupStages,
    {
      $addFields: {
        profit: {
          $subtract: [
            "$revenue",
            { $multiply: ["$quantitySold", "$variant.costPrice"] },
          ],
        },
      },
    },
  ];

  const [bestSelling, worstSelling, mostProfitable] = await Promise.all([
    Sale.aggregate([
      ...baseStages,
      { $sort: { quantitySold: -1, revenue: -1 } },
      { $limit: limit },
      { $project: productProjection },
    ]),
    Sale.aggregate([
      ...baseStages,
      { $sort: { quantitySold: 1, revenue: 1 } },
      { $limit: limit },
      { $project: productProjection },
    ]),
    Sale.aggregate([
      ...baseStages,
      { $sort: { profit: -1, revenue: -1 } },
      { $limit: limit },
      { $project: productProjection },
    ]),
  ]);

  return { bestSelling, worstSelling, mostProfitable };
};

const getLowStockProducts = (lowStockThreshold = 5, limit = 10) =>
  Inventory.aggregate([
    { $match: { quantity: { $lte: lowStockThreshold } } },
    {
      $lookup: {
        from: ProductVariant.collection.name,
        localField: "variantId",
        foreignField: "_id",
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "variant.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $sort: { quantity: 1, updatedAt: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        inventoryId: "$_id",
        variantId: "$variant._id",
        productId: "$product._id",
        name: "$product.name",
        sku: "$variant.sku",
        quantity: 1,
        costPrice: "$variant.costPrice",
        sellingPrice: "$variant.sellingPrice",
      },
    },
  ]);

const getMovingProducts = async (startDate, endDate, limit = 10) => {
  const fastMoving = await InventoryTransaction.aggregate([
    {
      $match: {
        type: "SALE",
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    { $group: { _id: "$variantId", quantityMoved: { $sum: "$quantity" } } },
    ...productLookupStages,
    { $sort: { quantityMoved: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        variantId: "$_id",
        productId: "$product._id",
        name: "$product.name",
        sku: "$variant.sku",
        quantityMoved: 1,
      },
    },
  ]);

  const slowMoving = await Inventory.aggregate([
    {
      $lookup: {
        from: InventoryTransaction.collection.name,
        let: { variantId: "$variantId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$variantId", "$$variantId"] },
                  { $eq: ["$type", "SALE"] },
                  { $gte: ["$createdAt", startDate] },
                  { $lt: ["$createdAt", endDate] },
                ],
              },
            },
          },
          { $group: { _id: null, quantityMoved: { $sum: "$quantity" } } },
        ],
        as: "movement",
      },
    },
    {
      $addFields: {
        quantityMoved: {
          $ifNull: [{ $arrayElemAt: ["$movement.quantityMoved", 0] }, 0],
        },
      },
    },
    {
      $lookup: {
        from: ProductVariant.collection.name,
        localField: "variantId",
        foreignField: "_id",
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "variant.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $sort: { quantityMoved: 1, quantity: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        inventoryId: "$_id",
        variantId: "$variant._id",
        productId: "$product._id",
        name: "$product.name",
        sku: "$variant.sku",
        stockQuantity: "$quantity",
        quantityMoved: 1,
      },
    },
  ]);

  return { fastMoving, slowMoving };
};

const getSalesTrend = (startDate, endDate, unit = "day") => {
  const formats = {
    day: "%Y-%m-%d",
    week: "%G-W%V",
    month: "%Y-%m",
    year: "%Y",
  };

  return Sale.aggregate([
    { $match: buildSaleDateMatch(startDate, endDate) },
    { $addFields: { netRevenue: netRevenueExpression } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: formats[unit] || formats.day,
            date: "$createdAt",
            timezone: "UTC",
          },
        },
        revenue: { $sum: "$netRevenue" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: "$_id",
        revenue: { $round: ["$revenue", 2] },
        orders: 1,
      },
    },
  ]);
};

const getCategoryPerformance = (startDate, endDate, limit = 10) =>
  Sale.aggregate([
    { $match: buildSaleDateMatch(startDate, endDate) },
    { $unwind: "$items" },
    {
      $lookup: {
        from: ProductVariant.collection.name,
        localField: "items.variantId",
        foreignField: "_id",
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "variant.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "product.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$product.categoryId",
        categoryName: { $first: "$category.name" },
        quantitySold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.totalPrice" },
      },
    },
    { $sort: { revenue: -1, quantitySold: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        categoryName: { $ifNull: ["$categoryName", "Uncategorized"] },
        quantitySold: 1,
        revenue: { $round: ["$revenue", 2] },
      },
    },
  ]);

const getTopCustomers = (startDate, endDate, limit = 10) =>
  Sale.aggregate([
    { $match: buildSaleDateMatch(startDate, endDate) },
    { $addFields: { netRevenue: netRevenueExpression } },
    {
      $group: {
        _id: "$customerId",
        totalSpending: { $sum: "$netRevenue" },
        totalPurchases: { $sum: 1 },
        lastPurchaseDate: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: Customer.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    { $sort: { totalSpending: -1, totalPurchases: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        customer: {
          id: "$customer._id",
          name: "$customer.name",
          phone: "$customer.phone",
          email: "$customer.email",
          address: "$customer.address",
          createdAt: "$customer.createdAt",
        },
        totalSpending: { $round: ["$totalSpending", 2] },
        totalPurchases: 1,
        purchaseFrequency: "$totalPurchases",
        lastPurchaseDate: 1,
      },
    },
  ]);

export const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const weekStart = getStartOfWeek(now);
    const monthStart = getStartOfMonth(now);
    const yearStart = getStartOfYear(now);
    const tomorrowStart = addDays(todayStart, 1);
    const previousMonthStart = addMonths(monthStart, -1);
    const previousYearStart = addYears(yearStart, -1);
    const lowStockThreshold = Number(req.query.lowStockThreshold || 5);
    const limit = getLimit(req.query.limit, 5);

    const [
      todaySales,
      weekSales,
      monthSales,
      yearSales,
      previousMonthSales,
      previousYearSales,
      monthExpenses,
      yearExpenses,
      inventory,
      totalCustomers,
      newCustomersThisMonth,
      newCustomersPreviousMonth,
      topCustomers,
      lowStockProducts,
      productPerformance,
    ] = await Promise.all([
      getSalesSummary(todayStart, tomorrowStart),
      getSalesSummary(weekStart, tomorrowStart),
      getSalesSummary(monthStart, tomorrowStart),
      getSalesSummary(yearStart, tomorrowStart),
      getSalesSummary(previousMonthStart, monthStart),
      getSalesSummary(previousYearStart, yearStart),
      getExpenseTotal(monthStart, tomorrowStart),
      getExpenseTotal(yearStart, tomorrowStart),
      getInventorySummary(lowStockThreshold),
      Customer.countDocuments(),
      getCustomerCount(monthStart, tomorrowStart),
      getCustomerCount(previousMonthStart, monthStart),
      getTopCustomers(yearStart, tomorrowStart, limit),
      getLowStockProducts(lowStockThreshold, limit),
      getProductPerformance(yearStart, tomorrowStart, limit),
    ]);

    return res.status(200).json({
      period: {
        generatedAt: now,
        yearStart,
        monthStart,
        weekStart,
        todayStart,
      },
      overview: {
        totalRevenue: yearSales.revenue,
        totalOrders: yearSales.orders,
        totalCustomers,
        inventoryValue: inventory.inventoryValue,
        expenses: yearExpenses,
        estimatedProfit: roundMoney(yearSales.revenue - yearExpenses),
      },
      salesMetrics: {
        revenueToday: todaySales.revenue,
        revenueThisWeek: weekSales.revenue,
        revenueThisMonth: monthSales.revenue,
        revenueThisYear: yearSales.revenue,
        ordersThisMonth: monthSales.orders,
        ordersThisYear: yearSales.orders,
      },
      growthMetrics: {
        revenueGrowthPercent: getGrowthPercent(
          monthSales.revenue,
          previousMonthSales.revenue,
        ),
        salesGrowthPercent: getGrowthPercent(
          monthSales.orders,
          previousMonthSales.orders,
        ),
        customerGrowthPercent: getGrowthPercent(
          newCustomersThisMonth,
          newCustomersPreviousMonth,
        ),
        annualRevenueGrowthPercent: getGrowthPercent(
          yearSales.revenue,
          previousYearSales.revenue,
        ),
      },
      inventoryMetrics: {
        ...inventory,
        lowStockProductCount: inventory.lowStockProducts,
        lowStockThreshold,
      },
      customerMetrics: {
        totalCustomers,
        newCustomersThisMonth,
        topCustomers,
      },
      profitMetrics: {
        revenue: monthSales.revenue,
        expenses: monthExpenses,
        estimatedProfit: roundMoney(monthSales.revenue - monthExpenses),
      },
      productPerformance,
      lowStockProducts,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch dashboard analytics",
      error: error.message,
    });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const limit = getLimit(req.query.limit);
    const [summary, dailySales, weeklySales, monthlySales, annualSales] =
      await Promise.all([
        getSalesSummary(startDate, endDate),
        getSalesTrend(startDate, endDate, "day"),
        getSalesTrend(startDate, endDate, "week"),
        getSalesTrend(startDate, endDate, "month"),
        getSalesTrend(startDate, endDate, "year"),
      ]);
    const [productPerformance, categoryPerformance] = await Promise.all([
      getProductPerformance(startDate, endDate, limit),
      getCategoryPerformance(startDate, endDate, limit),
    ]);

    return res.status(200).json({
      period: { startDate, endDate },
      summary,
      dailySales,
      weeklySales,
      monthlySales,
      annualSales,
      productPerformance,
      categoryPerformance,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales analytics",
      error: error.message,
    });
  }
};

export const getInventoryAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const lowStockThreshold = Number(req.query.lowStockThreshold || 5);
    const limit = getLimit(req.query.limit);
    const [summary, lowStockProducts, movingProducts] = await Promise.all([
      getInventorySummary(lowStockThreshold),
      getLowStockProducts(lowStockThreshold, limit),
      getMovingProducts(startDate, endDate, limit),
    ]);

    return res.status(200).json({
      period: { startDate, endDate },
      summary: {
        ...summary,
        lowStockThreshold,
      },
      lowStockProducts,
      fastMovingProducts: movingProducts.fastMoving,
      slowMovingProducts: movingProducts.slowMoving,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch inventory analytics",
      error: error.message,
    });
  }
};

export const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const limit = getLimit(req.query.limit);

    const [totalCustomers, newCustomers, returningCustomers, topCustomers] =
      await Promise.all([
        Customer.countDocuments(),
        getCustomerCount(startDate, endDate),
        Sale.aggregate([
          { $match: buildSaleDateMatch(startDate, endDate) },
          { $group: { _id: "$customerId", purchaseCount: { $sum: 1 } } },
          { $match: { purchaseCount: { $gt: 1 } } },
          { $count: "count" },
        ]),
        getTopCustomers(startDate, endDate, limit),
      ]);

    return res.status(200).json({
      period: { startDate, endDate },
      summary: {
        totalCustomers,
        newCustomers,
        returningCustomers: returningCustomers[0]?.count || 0,
      },
      topCustomers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer analytics",
      error: error.message,
    });
  }
};

export const getProfitAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(req.query);
    const [salesSummary, expensesByCategory] = await Promise.all([
      getSalesSummary(startDate, endDate),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: "$category",
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
        {
          $project: {
            _id: 0,
            category: "$_id",
            amount: { $round: ["$amount", 2] },
          },
        },
      ]),
    ]);

    const expenses = roundMoney(
      expensesByCategory.reduce((sum, item) => sum + item.amount, 0),
    );

    return res.status(200).json({
      period: { startDate, endDate },
      revenue: salesSummary.revenue,
      grossRevenue: salesSummary.grossRevenue,
      returnedAmount: salesSummary.returnedAmount,
      expenses,
      estimatedProfit: roundMoney(salesSummary.revenue - expenses),
      profitMarginPercent: salesSummary.revenue
        ? roundPercent(((salesSummary.revenue - expenses) / salesSummary.revenue) * 100)
        : 0,
      expensesByCategory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch profit analytics",
      error: error.message,
    });
  }
};
