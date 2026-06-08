import mongoose from "mongoose";
import Customer from "../customers/CustomerModel.js";
import { Inventory, InventoryTransaction } from "../inventory/InventoryModel.js";
import { ProductVariant } from "../products/ProductModel.js";
import Sale from "./SaleModel.js";

const createHttpError = (status, message) =>
  Object.assign(new Error(message), { status });

const formatCustomer = (customer) => {
  if (!customer?._id) {
    return customer || null;
  }

  return {
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
  };
};

const formatProduct = (product) => {
  if (!product?._id) {
    return product || null;
  }

  return {
    id: product._id,
    name: product.name,
    categoryId: product.categoryId,
    brandId: product.brandId,
    description: product.description,
    image: product.image,
  };
};

const formatVariant = (variant) => {
  if (!variant?._id) {
    return variant || null;
  }

  return {
    id: variant._id,
    product: formatProduct(variant.productId),
    ram: variant.ram,
    storage: variant.storage,
    color: variant.color,
    sku: variant.sku,
    sellingPrice: variant.sellingPrice,
    costPrice: variant.costPrice,
  };
};

const formatSaleItem = (item) => ({
  variant: formatVariant(item.variantId),
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  totalPrice: item.totalPrice,
  returnedQuantity: item.returnedQuantity || 0,
});

const formatReturnItem = (item) => ({
  variant: formatVariant(item.variantId),
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  totalAmount: item.totalAmount,
});

const formatReturn = (saleReturn) => ({
  id: saleReturn._id,
  items: saleReturn.items.map(formatReturnItem),
  totalAmount: saleReturn.totalAmount,
  notes: saleReturn.notes,
  processedBy: saleReturn.processedBy,
  processedAt: saleReturn.processedAt,
});

const formatSale = (sale) => ({
  id: sale._id,
  invoiceNumber: sale.invoiceNumber,
  customer: formatCustomer(sale.customerId),
  salespersonId: sale.salespersonId,
  items: sale.items.map(formatSaleItem),
  subtotal: sale.subtotal,
  discount: sale.discount,
  total: sale.total,
  paymentStatus: sale.paymentStatus,
  returnStatus: sale.returnStatus || "None",
  returnHistory: (sale.returnHistory || []).map(formatReturn),
  createdAt: sale.createdAt,
  updatedAt: sale.updatedAt,
});

const populateSale = (query) =>
  query.populate("customerId").populate({
    path: "items.variantId",
    populate: {
      path: "productId",
    },
  }).populate({
    path: "returnHistory.items.variantId",
    populate: {
      path: "productId",
    },
  });

const createInvoiceNumber = () => {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = new mongoose.Types.ObjectId()
    .toString()
    .slice(-6)
    .toUpperCase();

  return `INV-${stamp}-${suffix}`;
};

const ensureCustomerExists = async (customerId, session = null) => {
  const customer = await Customer.findById(customerId).session(session);

  if (!customer) {
    throw createHttpError(404, "Customer not found");
  }
};

const prepareSaleItems = async (items, session = null) => {
  const variantIds = items.map((item) => item.variantId);
  const variants = await ProductVariant.find({ _id: { $in: variantIds } })
    .select("_id sellingPrice")
    .session(session);

  const variantMap = new Map(
    variants.map((variant) => [variant._id.toString(), variant]),
  );

  if (variantMap.size !== new Set(variantIds.map(String)).size) {
    throw createHttpError(404, "One or more product variants were not found");
  }

  return items.map((item) => {
    const variant = variantMap.get(item.variantId.toString());

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? variant.sellingPrice,
    };
  });
};

const aggregateQuantities = (items) =>
  items.reduce((map, item) => {
    const variantId = item.variantId.toString();
    const currentQuantity = map.get(variantId) || 0;

    map.set(variantId, currentQuantity + item.quantity);

    return map;
  }, new Map());

const decrementInventory = async (items, saleId, userId, session) => {
  const quantitiesByVariant = aggregateQuantities(items);
  const transactions = [];

  for (const [variantId, quantity] of quantitiesByVariant.entries()) {
    const inventory = await Inventory.findOneAndUpdate(
      { variantId, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true, runValidators: true, session },
    );

    if (!inventory) {
      throw createHttpError(
        409,
        "Insufficient stock for one or more product variants",
      );
    }

    transactions.push({
      variantId,
      type: "SALE",
      quantity,
      referenceId: saleId,
      notes: `Sale ${saleId} created`,
      createdBy: userId,
    });
  }

  return InventoryTransaction.insertMany(transactions, { session });
};

const getQuantityMap = (items, quantityField = "quantity") =>
  items.reduce((map, item) => {
    const variantId = item.variantId.toString();
    const currentQuantity = map.get(variantId) || 0;

    map.set(variantId, currentQuantity + (item[quantityField] || 0));

    return map;
  }, new Map());

const prepareReturnItems = (sale, requestedItems) => {
  const soldQuantities = getQuantityMap(sale.items);
  const returnedQuantities = getQuantityMap(sale.items, "returnedQuantity");
  const requestedQuantities = getQuantityMap(requestedItems);
  const unitPrices = new Map();

  sale.items.forEach((item) => {
    unitPrices.set(item.variantId.toString(), item.unitPrice);
  });

  for (const [variantId, quantity] of requestedQuantities.entries()) {
    const soldQuantity = soldQuantities.get(variantId) || 0;
    const returnedQuantity = returnedQuantities.get(variantId) || 0;
    const returnableQuantity = soldQuantity - returnedQuantity;

    if (!soldQuantity) {
      throw createHttpError(
        400,
        "Returned product variant was not part of this sale",
      );
    }

    if (quantity > returnableQuantity) {
      throw createHttpError(
        409,
        "Returned quantity exceeds remaining returnable quantity",
      );
    }
  }

  return [...requestedQuantities.entries()].map(([variantId, quantity]) => {
    const unitPrice = unitPrices.get(variantId);

    return {
      variantId,
      quantity,
      unitPrice,
      totalAmount: quantity * unitPrice,
    };
  });
};

const incrementInventoryForReturn = async (items, saleId, userId, session) => {
  await Promise.all(
    items.map((item) =>
      Inventory.findOneAndUpdate(
        { variantId: item.variantId },
        { $inc: { quantity: item.quantity } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      ),
    ),
  );

  return InventoryTransaction.insertMany(
    items.map((item) => ({
      variantId: item.variantId,
      type: "RETURN",
      quantity: item.quantity,
      referenceId: saleId,
      notes: `Sale ${saleId} return processed`,
      createdBy: userId,
    })),
    { session },
  );
};

const applyReturnedQuantities = (sale, returnItems) => {
  const remainingByVariant = getQuantityMap(returnItems);

  sale.items.forEach((item) => {
    const variantId = item.variantId.toString();
    const remainingQuantity = remainingByVariant.get(variantId) || 0;

    if (!remainingQuantity) {
      return;
    }

    item.returnedQuantity = item.returnedQuantity || 0;

    const availableQuantity = item.quantity - item.returnedQuantity;
    const quantityToApply = Math.min(availableQuantity, remainingQuantity);

    item.returnedQuantity += quantityToApply;
    remainingByVariant.set(variantId, remainingQuantity - quantityToApply);
  });
};

const updateReturnStatus = (sale) => {
  const soldQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedQuantity = sale.items.reduce(
    (sum, item) => sum + (item.returnedQuantity || 0),
    0,
  );

  if (returnedQuantity === 0) {
    sale.returnStatus = "None";
    return;
  }

  sale.returnStatus =
    returnedQuantity === soldQuantity ? "Returned" : "Partial";

  if (sale.returnStatus === "Returned") {
    sale.paymentStatus = "Refunded";
  }
};

export const getSales = async (req, res) => {
  try {
    const sales = await populateSale(Sale.find().sort({ createdAt: -1 }));

    return res.status(200).json({
      sales: sales.map(formatSale),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message,
    });
  }
};

export const getSale = async (req, res) => {
  try {
    const sale = await populateSale(Sale.findById(req.params.id));

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(200).json({ sale: formatSale(sale) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sale",
      error: error.message,
    });
  }
};

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let sale;
    let transactions = [];

    await session.withTransaction(async () => {
      await ensureCustomerExists(req.body.customerId, session);

      const items = await prepareSaleItems(req.body.items, session);
      const discount = req.body.discount || 0;
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      if (discount > subtotal) {
        throw createHttpError(400, "Discount cannot exceed sale subtotal");
      }

      const [createdSale] = await Sale.create(
        [
          {
            invoiceNumber: createInvoiceNumber(),
            customerId: req.body.customerId,
            salespersonId: req.user._id,
            items,
            discount,
            paymentStatus: req.body.paymentStatus || "Pending",
          },
        ],
        { session },
      );

      sale = createdSale;
      transactions = await decrementInventory(
        items,
        sale._id,
        req.user._id,
        session,
      );
    });

    const populatedSale = await populateSale(Sale.findById(sale._id));

    return res.status(201).json({
      sale: formatSale(populatedSale),
      transactionIds: transactions.map((transaction) => transaction._id),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to create sale",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

export const processSaleReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let sale;
    let transactions = [];

    await session.withTransaction(async () => {
      sale = await Sale.findById(req.params.id).session(session);

      if (!sale) {
        throw createHttpError(404, "Sale not found");
      }

      const returnItems = prepareReturnItems(sale, req.body.items);
      const totalAmount = returnItems.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );

      applyReturnedQuantities(sale, returnItems);
      updateReturnStatus(sale);

      sale.returnHistory.push({
        items: returnItems,
        totalAmount,
        notes: req.body.notes || "",
        processedBy: req.user._id,
      });

      await sale.save({ session });

      transactions = await incrementInventoryForReturn(
        returnItems,
        sale._id,
        req.user._id,
        session,
      );
    });

    const populatedSale = await populateSale(Sale.findById(sale._id));

    return res.status(200).json({
      sale: formatSale(populatedSale),
      transactionIds: transactions.map((transaction) => transaction._id),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to process sale return",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
