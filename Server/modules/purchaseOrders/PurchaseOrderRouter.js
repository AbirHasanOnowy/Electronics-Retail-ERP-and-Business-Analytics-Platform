import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder,
  updatePurchaseOrder,
} from "./PurchaseOrderController.js";
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

const purchaseOrderIdValidation = [
  param("id").isMongoId().withMessage("Valid purchase order id is required"),
];

const itemValidation = [
  body("items").isArray({ min: 1 }).withMessage("Items are required"),
  body("items.*.variantId")
    .isMongoId()
    .withMessage("Valid product variant is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .toInt()
    .withMessage("Quantity must be at least 1"),
  body("items.*.unitCost")
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Unit cost cannot be negative"),
];

const createValidation = [
  body("supplierId").isMongoId().withMessage("Valid supplier id is required"),
  body("status")
    .optional()
    .isIn(["Draft", "Ordered"])
    .withMessage("Status must be Draft or Ordered"),
  ...itemValidation,
];

const updateValidation = [
  ...purchaseOrderIdValidation,
  body("supplierId")
    .optional()
    .isMongoId()
    .withMessage("Valid supplier id is required"),
  body("status")
    .optional()
    .isIn(["Draft", "Ordered", "Cancelled"])
    .withMessage("Status must be Draft, Ordered, or Cancelled"),
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Items must contain at least one item"),
  body("items.*.variantId")
    .if(body("items").exists())
    .isMongoId()
    .withMessage("Valid product variant is required"),
  body("items.*.quantity")
    .if(body("items").exists())
    .isInt({ min: 1 })
    .toInt()
    .withMessage("Quantity must be at least 1"),
  body("items.*.unitCost")
    .if(body("items").exists())
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Unit cost cannot be negative"),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  getPurchaseOrders,
);
router.get(
  "/:id",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(purchaseOrderIdValidation),
  getPurchaseOrder,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(createValidation),
  createPurchaseOrder,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(updateValidation),
  updatePurchaseOrder,
);
router.patch(
  "/:id/receive",
  authorizeRoles("Admin", "Manager"),
  runValidation(purchaseOrderIdValidation),
  receivePurchaseOrder,
);

export default router;
