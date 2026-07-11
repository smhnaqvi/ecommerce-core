import express, { NextFunction, RequestHandler } from "express";
import cors from "cors";

import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health.routes";
import authRouter from "./routes/auth.routes";
import categoryRouter from "./routes/category.routes";
import productRouter from "./routes/product.routes";
import orderRouter from "./routes/order.routes";
import paymentRouter from "./routes/payment.routes";

import { connectDB } from "./config/db";
import { stripeWebhook } from "./controllers/payment.controller";


// Single promise — created once when module loads, reused on every request
const dbConnection = connectDB();


const app = express();

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());

app.use(cookieParser());

const allowedOrigins = process.env.CLIENT_URL?.split(",").map((url) => url.trim()) ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Await the SAME promise on every request — after first resolve, instant
const dbMiddleware: RequestHandler = (req, res, next) => {
  dbConnection.then(() => next()).catch(next);
};

app.use(dbMiddleware);


app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);


app.use(notFound);
app.use(errorHandler);

export default app;