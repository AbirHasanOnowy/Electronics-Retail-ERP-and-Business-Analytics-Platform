import express from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  createBudget,
  getBudgets,
  updateBudget,
} from "./BudgetController.js";
import { EXPENSE_CATEGORIES } from "./BudgetModel.js";
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

const budgetIdValidation = [
  param("id").isMongoId().withMessage("Valid budget id is required"),
];

const categoryValidation = (field) =>
  field
    .isIn(EXPENSE_CATEGORIES)
    .withMessage(`Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`);

const budgetBodyValidation = [
  body("month")
    .isInt({ min: 1, max: 12 })
    .toInt()
    .withMessage("Month must be between 1 and 12"),
  body("year")
    .isInt({ min: 2000 })
    .toInt()
    .withMessage("Year must be 2000 or later"),
  categoryValidation(body("category")),
  body("allocatedAmount")
    .isFloat({ min: 0.01 })
    .toFloat()
    .withMessage("Allocated amount must be positive"),
];

const budgetUpdateValidation = [
  ...budgetIdValidation,
  body("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .toInt()
    .withMessage("Month must be between 1 and 12"),
  body("year")
    .optional()
    .isInt({ min: 2000 })
    .toInt()
    .withMessage("Year must be 2000 or later"),
  categoryValidation(body("category").optional()),
  body("allocatedAmount")
    .optional()
    .isFloat({ min: 0.01 })
    .toFloat()
    .withMessage("Allocated amount must be positive"),
];

const budgetQueryValidation = [
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
  categoryValidation(query("category").optional()),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(budgetQueryValidation),
  getBudgets,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(budgetBodyValidation),
  createBudget,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(budgetUpdateValidation),
  updateBudget,
);

export default router;
