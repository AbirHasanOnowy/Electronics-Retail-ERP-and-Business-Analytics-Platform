import express from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "./ExpenseController.js";
import { EXPENSE_CATEGORIES } from "../budgets/BudgetModel.js";
import {
  authenticate,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

const runValidation = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }

    next();
  };
};

const expenseIdValidation = [
  param("id").isMongoId().withMessage("Valid expense id is required"),
];

const categoryValidation = (field) =>
  field
    .isIn(EXPENSE_CATEGORIES)
    .withMessage(`Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);

const expenseBodyValidation = [
  categoryValidation(body("category")),
  body("amount")
    .isFloat({ min: 0.01 })
    .toFloat()
    .withMessage("Expense amount must be positive"),
  body("description").optional().trim(),
  body("expenseDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Expense date must be a valid ISO date"),
];

const expenseUpdateValidation = [
  ...expenseIdValidation,
  categoryValidation(body("category").optional()),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .toFloat()
    .withMessage("Expense amount must be positive"),
  body("description").optional().trim(),
  body("expenseDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Expense date must be a valid ISO date"),
];

const expenseQueryValidation = [
  categoryValidation(query("category").optional()),
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .toInt()
    .withMessage("Month must be between 1 and 12"),
  query("year")
    .optional()
    .isInt({ min: 2000 })
    .toInt()
    .withMessage("Year must be 2000 or later"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(expenseQueryValidation),
  getExpenses,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(expenseBodyValidation),
  createExpense,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(expenseUpdateValidation),
  updateExpense,
);
router.delete(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(expenseIdValidation),
  deleteExpense,
);

export default router;
