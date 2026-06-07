import User from "./AuthModel.js";
import jwt from "jsonwebtoken";

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sendAuthResponse = (res, statusCode, user) => {
  const token = createToken(user._id);

  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      name,
      email,
      password, //password hashing is defined in AuthModel.js to prevent saving password without hashing accidently
      role,
    });

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User account is deactivated" });
    }

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
};
