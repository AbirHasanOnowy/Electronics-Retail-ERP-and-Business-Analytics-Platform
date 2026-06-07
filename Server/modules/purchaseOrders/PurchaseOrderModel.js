import mongoose from "mongoose";

const purchaseOrderStatuses = ["Draft", "Ordered", "Received", "Cancelled"];

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: [true, "Product variant is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitCost: {
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },
    totalCost: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0, "Total cost cannot be negative"],
    },
  },
  {
    _id: false,
  },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
      index: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Purchase order must contain at least one item",
      },
    },
    totalCost: {
      type: Number,
      required: [true, "Total cost is required"],
      min: [0, "Total cost cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: purchaseOrderStatuses,
      default: "Draft",
      index: true,
    },
    orderedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

purchaseOrderSchema.pre("validate", function calculateTotals(next) {
  this.items.forEach((item) => {
    item.totalCost = item.quantity * item.unitCost;
  });

  this.totalCost = this.items.reduce((sum, item) => sum + item.totalCost, 0);

  if (this.status === "Ordered" && !this.orderedAt) {
    this.orderedAt = new Date();
  }
});

purchaseOrderSchema.index({ supplierId: 1, createdAt: -1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });

export const PURCHASE_ORDER_STATUSES = purchaseOrderStatuses;
export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
