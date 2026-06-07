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

const ensureVariantExists = async (variantId) => {
  const variant = await ProductVariant.findById(variantId);

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
}) =>
  InventoryTransaction.create({
    variantId,
    type,
    quantity,
    referenceId,
    notes,
    createdBy: userId,
  });

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
  try {
    const {
      variantId,
      quantity,
      type = "PURCHASE",
      referenceId = "",
      notes = "",
    } = req.body;

    const variant = await ensureVariantExists(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Product variant not found" });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { variantId },
      { $inc: { quantity } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    const transaction = await createTransaction({
      variantId,
      type,
      quantity,
      referenceId,
      notes,
      userId: req.user._id,
    });

    const populatedInventory = await populateInventory(
      Inventory.findById(inventory._id),
    );

    return res.status(201).json({
      inventory: formatInventory(populatedInventory),
      transaction: formatTransaction(transaction),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add stock",
      error: error.message,
    });
  }
};

export const stockOut = async (req, res) => {
  try {
    const {
      variantId,
      quantity,
      type = "SALE",
      referenceId = "",
      notes = "",
    } = req.body;

    const variant = await ensureVariantExists(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Product variant not found" });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { variantId, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true, runValidators: true },
    );

    if (!inventory) {
      return res.status(409).json({
        message: "Insufficient stock for this product variant",
      });
    }

    const transaction = await createTransaction({
      variantId,
      type,
      quantity,
      referenceId,
      notes,
      userId: req.user._id,
    });

    const populatedInventory = await populateInventory(
      Inventory.findById(inventory._id),
    );

    return res.status(200).json({
      inventory: formatInventory(populatedInventory),
      transaction: formatTransaction(transaction),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove stock",
      error: error.message,
    });
  }
};
