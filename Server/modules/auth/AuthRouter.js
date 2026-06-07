import express from "express";
import { body, validationResult } from "express-validator";
import { login, logout, register } from "./AuthController.js";

const router = express.Router();

const runValidation = (validations) => {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map((validation) => validation.run(req)));

      const result = validationResult(req);

      if (!result.isEmpty()) {
        return res.status(400).json({ errors: result.array() });
      }

      next();
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  };
};

router.post(
  "/register",
  runValidation([
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
  ]),
  register,
);

router.post(
  "/login",
  runValidation([
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  login,
);

router.post("/logout", logout);

export default router;
