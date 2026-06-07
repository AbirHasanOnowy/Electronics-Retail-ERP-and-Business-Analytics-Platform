import express from "express";
import { body, validationResult } from "express-validator";
import { getInventory, stockIn, stockOut } from "./InventoryController.js";
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

const stockBodyValidation = [
  body("variantId").isMongoId().withMessage("Valid product variant is required"),
  body("quantity")
    .isInt({ min: 1 })
    .toInt()
    .withMessage("Quantity must be at least 1"),
  body("referenceId").optional().trim(),
  body("notes").optional().trim(),
];

const stockInValidation = [
  ...stockBodyValidation,
  body("type")
    .optional()
    .isIn(["PURCHASE", "RETURN", "ADJUSTMENT"])
    .withMessage("Stock-in type must be PURCHASE, RETURN, or ADJUSTMENT"),
];

const stockOutValidation = [
  ...stockBodyValidation,
  body("type")
    .optional()
    .isIn(["SALE", "ADJUSTMENT"])
    .withMessage("Stock-out type must be SALE or ADJUSTMENT"),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  getInventory,
);
router.post(
  "/stock-in",
  authorizeRoles("Admin", "Manager"),
  runValidation(stockInValidation),
  stockIn,
);
router.post(
  "/stock-out",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(stockOutValidation),
  stockOut,
);

export default router;
