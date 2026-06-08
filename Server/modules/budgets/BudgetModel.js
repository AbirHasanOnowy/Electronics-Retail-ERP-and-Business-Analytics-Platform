import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Utilities",
  "Internet",
  "Marketing",
  "Equipment",
  "Miscellaneous",
];

const budgetSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: [true, "Budget month is required"],
      min: [1, "Budget month must be between 1 and 12"],
      max: [12, "Budget month must be between 1 and 12"],
    },
    year: {
      type: Number,
      required: [true, "Budget year is required"],
      min: [2000, "Budget year must be 2000 or later"],
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: [true, "Budget category is required"],
      trim: true,
    },
    allocatedAmount: {
      type: Number,
      required: [true, "Allocated amount is required"],
      min: [0.01, "Allocated amount must be positive"],
    },
  },
  {
    timestamps: true,
  },
);

budgetSchema.index({ year: 1, month: 1, category: 1 }, { unique: true });
budgetSchema.index({ category: 1, year: 1, month: 1 });

export default mongoose.model("Budget", budgetSchema);
