import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRouter from "./modules/auth/AuthRouter.js";
import inventoryRouter from "./modules/inventory/InventoryRouter.js";
import productRouter from "./modules/products/ProductRouter.js";
import purchaseOrderRouter from "./modules/purchaseOrders/PurchaseOrderRouter.js";
import supplierRouter from "./modules/suppliers/SupplierRouter.js";
import userRouter from "./modules/users/UserRouter.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (NODE_ENV !== "test") {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
}

app.get("/", (req, res) => {
  res.json({
    message: "Electronics Retail ERP API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/purchase-orders", purchaseOrderRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// app.use((err, req, res, next) => {
//   const statusCode = err.statusCode || 500;

//   res.status(statusCode).json({
//     message: err.message || "Internal server error",
//     ...(NODE_ENV === "development" && { stack: err.stack }),
//   });
// });

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  });

  //   const shutdown = async (signal) => {
  //     console.log(`${signal} received. Shutting down...`);

  //     server.close(async () => {
  //       await mongoose.connection.close();
  //       console.log("Server and MongoDB connection closed");
  //       process.exit(0);
  //     });
  //   };

  //   process.on("SIGINT", () => shutdown("SIGINT"));
  //   process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer();
