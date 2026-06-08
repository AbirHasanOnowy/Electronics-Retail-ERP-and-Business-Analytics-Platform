import mongoose from "mongoose";

const paymentStatuses = ["Pending", "Paid", "Partial", "Refunded"];
const returnStatuses = ["None", "Partial", "Returned"];

const saleItemSchema = new mongoose.Schema(
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
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
    returnedQuantity: {
      type: Number,
      min: [0, "Returned quantity cannot be negative"],
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const saleReturnItemSchema = new mongoose.Schema(
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
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
  },
  {
    _id: false,
  },
);

const saleReturnSchema = new mongoose.Schema(
  {
    items: {
      type: [saleReturnItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Return must contain at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: [true, "Return total amount is required"],
      min: [0, "Return total amount cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Return processor is required"],
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },
    salespersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Salesperson is required"],
      index: true,
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Sale must contain at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
      default: 0,
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
      min: [0, "Discount cannot be negative"],
      default: 0,
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: paymentStatuses,
      default: "Pending",
      index: true,
    },
    returnStatus: {
      type: String,
      enum: returnStatuses,
      default: "None",
      index: true,
    },
    returnHistory: {
      type: [saleReturnSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

saleSchema.pre("validate", function calculateTotals() {
  this.items.forEach((item) => {
    item.totalPrice = item.quantity * item.unitPrice;
  });

  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total = Math.max(this.subtotal - this.discount, 0);
});

saleSchema.index({ customerId: 1, createdAt: -1 });
saleSchema.index({ salespersonId: 1, createdAt: -1 });
saleSchema.index({ createdAt: -1 });

export const PAYMENT_STATUSES = paymentStatuses;
export const RETURN_STATUSES = returnStatuses;
export default mongoose.model("Sale", saleSchema);
