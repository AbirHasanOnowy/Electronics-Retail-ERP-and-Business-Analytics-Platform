import mongoose from "mongoose";
import {
  Inventory,
  InventoryTransaction,
} from "../inventory/InventoryModel.js";
import { ProductVariant } from "../products/ProductModel.js";
import Supplier from "../suppliers/SupplierModel.js";
import PurchaseOrder from "./PurchaseOrderModel.js";

const createHttpError = (status, message) =>
  Object.assign(new Error(message), { status });

const formatSupplier = (supplier) => {
  if (!supplier?._id) {
    return supplier || null;
  }

  return {
    id: supplier._id,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
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

const formatPurchaseOrderItem = (item) => ({
  variant: formatVariant(item.variantId),
  quantity: item.quantity,
  unitCost: item.unitCost,
  totalCost: item.totalCost,
});

const formatPurchaseOrder = (purchaseOrder) => ({
  id: purchaseOrder._id,
  supplier: formatSupplier(purchaseOrder.supplierId),
  items: purchaseOrder.items.map(formatPurchaseOrderItem),
  totalCost: purchaseOrder.totalCost,
  status: purchaseOrder.status,
  orderedAt: purchaseOrder.orderedAt,
  receivedAt: purchaseOrder.receivedAt,
  createdBy: purchaseOrder.createdBy,
  receivedBy: purchaseOrder.receivedBy,
  createdAt: purchaseOrder.createdAt,
  updatedAt: purchaseOrder.updatedAt,
});

const populatePurchaseOrder = (query) =>
  query.populate("supplierId").populate({
    path: "items.variantId",
    populate: {
      path: "productId",
    },
  });

const ensureSupplierExists = async (supplierId, session = null) => {
  const supplier = await Supplier.findById(supplierId).session(session);

  if (!supplier) {
    throw createHttpError(404, "Supplier not found");
  }
};

const ensureVariantsExist = async (items, session = null) => {
  const variantIds = items.map((item) => item.variantId);
  const variants = await ProductVariant.find({ _id: { $in: variantIds } })
    .select("_id")
    .session(session);

  if (variants.length !== new Set(variantIds.map(String)).size) {
    throw createHttpError(404, "One or more product variants were not found");
  }
};

const syncVariantCostPrices = (items, session) => {
  const costPriceByVariant = items.reduce((map, item) => {
    map.set(item.variantId.toString(), item.unitCost);
    return map;
  }, new Map());

  return ProductVariant.bulkWrite(
    [...costPriceByVariant.entries()].map(([variantId, costPrice]) => ({
      updateOne: {
        filter: { _id: variantId },
        update: { $set: { costPrice } },
      },
    })),
    { session },
  );
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await populatePurchaseOrder(
      PurchaseOrder.find().sort({ createdAt: -1 }),
    );

    return res.status(200).json({
      purchaseOrders: purchaseOrders.map(formatPurchaseOrder),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch purchase orders",
      error: error.message,
    });
  }
};

export const getPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await populatePurchaseOrder(
      PurchaseOrder.findById(req.params.id),
    );

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    return res.status(200).json({
      purchaseOrder: formatPurchaseOrder(purchaseOrder),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch purchase order",
      error: error.message,
    });
  }
};

export const createPurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let purchaseOrder;

    await session.withTransaction(async () => {
      await ensureSupplierExists(req.body.supplierId, session);
      await ensureVariantsExist(req.body.items, session);

      const [createdPurchaseOrder] = await PurchaseOrder.create(
        [
          {
            supplierId: req.body.supplierId,
            items: req.body.items,
            status: req.body.status || "Draft",
            createdBy: req.user._id,
          },
        ],
        { session },
      );

      purchaseOrder = createdPurchaseOrder;
    });

    const populatedPurchaseOrder = await populatePurchaseOrder(
      PurchaseOrder.findById(purchaseOrder._id),
    );

    return res.status(201).json({
      purchaseOrder: formatPurchaseOrder(populatedPurchaseOrder),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({
      message: "Failed to create purchase order",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

export const updatePurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let purchaseOrder;

    await session.withTransaction(async () => {
      purchaseOrder = await PurchaseOrder.findById(req.params.id).session(
        session,
      );

      if (!purchaseOrder) {
        throw createHttpError(404, "Purchase order not found");
      }

      if (["Received", "Cancelled"].includes(purchaseOrder.status)) {
        throw createHttpError(
          409,
          "Received or cancelled purchase orders cannot be edited",
        );
      }

      if (req.body.supplierId) {
        await ensureSupplierExists(req.body.supplierId, session);
        purchaseOrder.supplierId = req.body.supplierId;
      }

      if (req.body.items) {
        await ensureVariantsExist(req.body.items, session);
        purchaseOrder.items = req.body.items;
      }

      if (req.body.status) {
        purchaseOrder.status = req.body.status;
      }

      await purchaseOrder.save({ session });
    });

    const populatedPurchaseOrder = await populatePurchaseOrder(
      PurchaseOrder.findById(purchaseOrder._id),
    );

    return res.status(200).json({
      purchaseOrder: formatPurchaseOrder(populatedPurchaseOrder),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to update purchase order",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

export const receivePurchaseOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let purchaseOrder;
    let transactions = [];

    await session.withTransaction(async () => {
      purchaseOrder = await PurchaseOrder.findById(req.params.id).session(
        session,
      );

      if (!purchaseOrder) {
        throw createHttpError(404, "Purchase order not found");
      }

      if (purchaseOrder.status === "Received") {
        throw createHttpError(409, "Purchase order is already received");
      }

      if (purchaseOrder.status === "Cancelled") {
        throw createHttpError(
          409,
          "Cancelled purchase orders cannot be received",
        );
      }

      await Promise.all(
        purchaseOrder.items.map((item) =>
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

      await syncVariantCostPrices(purchaseOrder.items, session);

      transactions = await InventoryTransaction.insertMany(
        purchaseOrder.items.map((item) => ({
          variantId: item.variantId,
          type: "PURCHASE",
          quantity: item.quantity,
          referenceId: purchaseOrder._id,
          notes: `Purchase order ${purchaseOrder._id} received`,
          createdBy: req.user._id,
        })),
        { session },
      );

      purchaseOrder.status = "Received";
      purchaseOrder.receivedAt = new Date();
      purchaseOrder.receivedBy = req.user._id;

      if (!purchaseOrder.orderedAt) {
        purchaseOrder.orderedAt = purchaseOrder.receivedAt;
      }

      await purchaseOrder.save({ session });
    });

    const populatedPurchaseOrder = await populatePurchaseOrder(
      PurchaseOrder.findById(purchaseOrder._id),
    );

    return res.status(200).json({
      purchaseOrder: formatPurchaseOrder(populatedPurchaseOrder),
      transactionIds: transactions.map((transaction) => transaction._id),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to receive purchase order",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
