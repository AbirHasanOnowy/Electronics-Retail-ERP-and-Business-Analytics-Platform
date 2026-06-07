import express from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  createCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "./CustomerController.js";
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

const customerIdValidation = [
  param("id").isMongoId().withMessage("Valid customer id is required"),
];

const customerBodyValidation = [
  body("name").trim().notEmpty().withMessage("Customer name is required"),
  body("phone").trim().notEmpty().withMessage("Customer phone is required"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("address").optional().trim(),
];

const customerUpdateValidation = [
  ...customerIdValidation,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Customer name cannot be empty"),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Customer phone cannot be empty"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("address").optional().trim(),
];

const customerQueryValidation = [
  query("search").optional().trim(),
];

router.use(authenticate);

router.get(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(customerQueryValidation),
  getCustomers,
);
router.get(
  "/:id",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(customerIdValidation),
  getCustomerById,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(customerBodyValidation),
  createCustomer,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(customerUpdateValidation),
  updateCustomer,
);

export default router;
