import mongoose from "mongoose";

const transactionTypes = ["PURCHASE", "SALE", "RETURN", "ADJUSTMENT"];

const inventorySchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: [true, "Product variant is required"],
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const inventoryTransactionSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: [true, "Product variant is required"],
      index: true,
    },
    type: {
      type: String,
      enum: transactionTypes,
      required: [true, "Transaction type is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    referenceId: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction creator is required"],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

inventoryTransactionSchema.index({ variantId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });

export const TRANSACTION_TYPES = transactionTypes;
export const Inventory = mongoose.model("Inventory", inventorySchema);
export const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);
