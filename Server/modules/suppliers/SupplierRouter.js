import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
} from "./SupplierController.js";
import {
  authenticate,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";
import Supplier from "./SupplierModel.js";

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

const supplierIdValidation = [
  param("id").isMongoId().withMessage("Valid supplier id is required"),
];

const supplierBodyValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Supplier name is required")
    .custom(async (name) => {
      const supplier = await Supplier.findOne({ name });

      if (supplier) {
        throw new Error("Supplier name already exists");
      }
    }),
  body("phone").trim().notEmpty().withMessage("Supplier phone is required"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("address").optional().trim(),
];

const supplierUpdateValidation = [
  ...supplierIdValidation,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Supplier name cannot be empty")
    .custom(async (name, { req }) => {
      const supplier = await Supplier.findOne({ name });

      if (supplier && supplier._id.toString() !== req.params.id) {
        throw new Error("Supplier name already exists");
      }
    }),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Supplier phone cannot be empty"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("address").optional().trim(),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  getSuppliers,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(supplierBodyValidation),
  createSupplier,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(supplierUpdateValidation),
  updateSupplier,
);
router.delete(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(supplierIdValidation),
  deleteSupplier,
);

export default router;
