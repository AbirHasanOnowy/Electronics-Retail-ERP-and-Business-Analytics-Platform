import express from "express";
import { body, param, validationResult } from "express-validator";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "./UserController.js";

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

const userIdValidation = [
  param("id").isMongoId().withMessage("Valid user id is required"),
];

const userBodyValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["Admin", "Manager", "Salesperson"])
    .withMessage("Role must be Admin, Manager, or Salesperson"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

const userUpdateValidation = [
  ...userIdValidation,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["Admin", "Manager", "Salesperson"])
    .withMessage("Role must be Admin, Manager, or Salesperson"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

router.get("/", getUsers);
router.get("/:id", runValidation(userIdValidation), getUserById);
router.post("/", runValidation(userBodyValidation), createUser);
router.put("/:id", runValidation(userUpdateValidation), updateUser);
router.delete("/:id", runValidation(userIdValidation), deleteUser);

export default router;
