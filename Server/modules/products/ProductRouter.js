import express from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  getBrands,
  getCategories,
  getProductById,
  getProducts,
  updateBrand,
  updateCategory,
  updateProduct,
} from "./ProductController.js";
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

const idValidation = [
  param("id").isMongoId().withMessage("Valid id is required"),
];

const nameValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
];

const categoryBodyValidation = [
  ...nameValidation,
  body("description").optional().trim(),
];

const categoryUpdateValidation = [
  ...idValidation,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim(),
];

const brandUpdateValidation = [
  ...idValidation,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
];

const variantValidation = [
  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array"),
  body("variants.*.ram").optional().trim(),
  body("variants.*.storage").optional().trim(),
  body("variants.*.color").optional().trim(),
  body("variants.*.sku").trim().notEmpty().withMessage("SKU is required"),
  body("variants.*.sellingPrice")
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Selling price must be zero or greater"),
  body("variants.*.costPrice")
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("Cost price must be zero or greater"),
];

const productBodyValidation = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("categoryId").isMongoId().withMessage("Valid category is required"),
  body("brandId").isMongoId().withMessage("Valid brand is required"),
  body("description").optional().trim(),
  body("image").optional().trim(),
  ...variantValidation,
];

const productUpdateValidation = [
  ...idValidation,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty"),
  body("categoryId")
    .optional()
    .isMongoId()
    .withMessage("Valid category is required"),
  body("brandId").optional().isMongoId().withMessage("Valid brand is required"),
  body("description").optional().trim(),
  body("image").optional().trim(),
  ...variantValidation,
];

const productQueryValidation = [
  query("categoryId")
    .optional()
    .isMongoId()
    .withMessage("Valid category is required"),
  query("brandId").optional().isMongoId().withMessage("Valid brand is required"),
  query("search").optional().trim(),
];

router.use(authenticate);

router.get(
  "/categories",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  getCategories,
);
router.post(
  "/categories",
  authorizeRoles("Admin", "Manager"),
  runValidation(categoryBodyValidation),
  createCategory,
);
router.put(
  "/categories/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(categoryUpdateValidation),
  updateCategory,
);
router.delete(
  "/categories/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(idValidation),
  deleteCategory,
);

router.get(
  "/brands",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  getBrands,
);
router.post(
  "/brands",
  authorizeRoles("Admin", "Manager"),
  runValidation(nameValidation),
  createBrand,
);
router.put(
  "/brands/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(brandUpdateValidation),
  updateBrand,
);
router.delete(
  "/brands/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(idValidation),
  deleteBrand,
);

router.get(
  "/",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(productQueryValidation),
  getProducts,
);
router.get(
  "/:id",
  authorizeRoles("Admin", "Manager", "Salesperson"),
  runValidation(idValidation),
  getProductById,
);
router.post(
  "/",
  authorizeRoles("Admin", "Manager"),
  runValidation(productBodyValidation),
  createProduct,
);
router.put(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(productUpdateValidation),
  updateProduct,
);
router.delete(
  "/:id",
  authorizeRoles("Admin", "Manager"),
  runValidation(idValidation),
  deleteProduct,
);

export default router;
