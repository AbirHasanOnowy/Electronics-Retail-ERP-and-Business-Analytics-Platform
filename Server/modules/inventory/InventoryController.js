import mongoose from "mongoose";
import { ProductVariant } from "../products/ProductModel.js";
import { Inventory, InventoryTransaction } from "./InventoryModel.js";

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

const formatInventory = (inventory) => ({
  id: inventory._id,
  variant: formatVariant(inventory.variantId),
  quantity: inventory.quantity,
  createdAt: inventory.createdAt,
  updatedAt: inventory.updatedAt,
});

const formatTransaction = (transaction) => ({
  id: transaction._id,
  variantId: transaction.variantId,
  type: transaction.type,
  quantity: transaction.quantity,
  referenceId: transaction.referenceId,
  notes: transaction.notes,
  createdBy: transaction.createdBy,
  createdAt: transaction.createdAt,
});

const createHttpError = (status, message) =>
  Object.assign(new Error(message), { status });

const ensureVariantExists = async (variantId, session = null) => {
  const variant = await ProductVariant.findById(variantId).session(session);

  if (!variant) {
    return null;
  }

  return variant;
};

const populateInventory = (query) =>
  query.populate({
    path: "variantId",
    populate: {
      path: "productId",
    },
  });

const createTransaction = ({
  variantId,
  type,
  quantity,
  referenceId,
  notes,
  userId,
  session,
}) =>
  InventoryTransaction.create(
    [
      {
        variantId,
        type,
        quantity,
        referenceId,
        notes,
        createdBy: userId,
      },
    ],
    { session },
  ).then(([transaction]) => transaction);

export const getInventory = async (req, res) => {
  try {
    const inventory = await populateInventory(
      Inventory.find().sort({ updatedAt: -1 }),
    );

    return res.status(200).json({
      inventory: inventory.map(formatInventory),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch inventory",
      error: error.message,
    });
  }
};

export const stockIn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      variantId,
      quantity,
      type = "PURCHASE",
      referenceId = null,
      notes = "",
    } = req.body;

    let inventory;
    let transaction;

    await session.withTransaction(async () => {
      const variant = await ensureVariantExists(variantId, session);

      if (!variant) {
        throw createHttpError(404, "Product variant not found");
      }

      inventory = await Inventory.findOneAndUpdate(
        { variantId },
        { $inc: { quantity } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        },
      );

      transaction = await createTransaction({
        variantId,
        type,
        quantity,
        referenceId,
        notes,
        userId: req.user._id,
        session,
      });
    });

    const populatedInventory = await populateInventory(
      Inventory.findById(inventory._id),
    );

    return res.status(201).json({
      inventory: formatInventory(populatedInventory),
      transaction: formatTransaction(transaction),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to add stock",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

export const stockOut = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      variantId,
      quantity,
      type = "SALE",
      referenceId = null,
      notes = "",
    } = req.body;

    let inventory;
    let transaction;

    await session.withTransaction(async () => {
      const variant = await ensureVariantExists(variantId, session);

      if (!variant) {
        throw createHttpError(404, "Product variant not found");
      }

      inventory = await Inventory.findOneAndUpdate(
        { variantId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true, runValidators: true, session },
      );

      if (!inventory) {
        throw createHttpError(
          409,
          "Insufficient stock for this product variant",
        );
      }

      transaction = await createTransaction({
        variantId,
        type,
        quantity,
        referenceId,
        notes,
        userId: req.user._id,
        session,
      });
    });

    const populatedInventory = await populateInventory(
      Inventory.findById(inventory._id),
    );

    return res.status(200).json({
      inventory: formatInventory(populatedInventory),
      transaction: formatTransaction(transaction),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to remove stock",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
