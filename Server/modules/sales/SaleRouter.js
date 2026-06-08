import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  createSale,
  getSale,
  getSales,
  processSaleReturn,
} from "./SaleController.js";
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

const saleIdValidation = [
  param("id").isMongoId().withMessage("Valid sale id is required"),
];

const createValidation = [
  body("customerId").isMongoId().withMessage("Valid customer id is required"),
  body("items").isArray({ min: 1 }).withMessage("Items are required"),
  body("items.*.variantId")
    .isMongoId()
    .withMessage("Valid product variant is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .toInt()
    .withMessage("Quantity must be at least 1"),
  body("items.*.unitPrice")
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Unit price cannot be negative"),
  body("discount")
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Discount cannot be negative"),
  body("paymentStatus")
    .optional()
    .isIn(["Pending", "Paid", "Partial"])
    .withMessage("Payment status must be Pending, Paid, or Partial"),
];

const returnValidation = [
  ...saleIdValidation,
  body("items").isArray({ min: 1 }).withMessage("Items are required"),
  body("items.*.variantId")
    .isMongoId()
    .withMessage("Valid product variant is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .toInt()
    .withMessage("Quantity must be at least 1"),
  body("notes").optional().trim(),
];

router.use(authenticate);

router.get("/", authorizeRoles("Admin", "Manager", "Salesperson"), getSales);
router.get(
  "/:id",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(saleIdValidation),
  getSale,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(createValidation),
  createSale,
);
router.post(
  "/:id/returns",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(returnValidation),
  processSaleReturn,
);

export default router;
