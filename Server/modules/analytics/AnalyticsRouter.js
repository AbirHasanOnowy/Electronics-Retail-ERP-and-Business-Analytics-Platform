import express from "express";
import { query, validationResult } from "express-validator";
import {
  getCustomerAnalytics,
  getDashboardAnalytics,
  getInventoryAnalytics,
  getProfitAnalytics,
  getSalesAnalytics,
} from "./AnalyticsController.js";
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

const dateRangeValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .bail()
    .custom((endDate, { req }) => {
      if (!req.query.startDate) {
        return true;
      }

      return new Date(endDate) >= new Date(req.query.startDate);
    })
    .withMessage("End date must be on or after start date"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("Limit must be between 1 and 100"),
];

const inventoryValidation = [
  ...dateRangeValidation,
  query("lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage("Low stock threshold cannot be negative"),
];

router.use(authenticate);
router.use(authorizeRoles("Admin", "Manager"));

router.get(
  "/dashboard",
  runValidation(inventoryValidation),
  getDashboardAnalytics,
);
router.get("/sales", runValidation(dateRangeValidation), getSalesAnalytics);
router.get(
  "/inventory",
  runValidation(inventoryValidation),
  getInventoryAnalytics,
);
router.get(
  "/customers",
  runValidation(dateRangeValidation),
  getCustomerAnalytics,
);
router.get("/profit", runValidation(dateRangeValidation), getProfitAnalytics);

export default router;
