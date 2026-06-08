import mongoose from "mongoose";
import { EXPENSE_CATEGORIES } from "../budgets/BudgetModel.js";

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: [true, "Expense category is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0.01, "Expense amount must be positive"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    expenseDate: {
      type: Date,
      required: [true, "Expense date is required"],
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Expense creator is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ createdBy: 1, expenseDate: -1 });

export default mongoose.model("Expense", expenseSchema);
