import express from "express";
import healthRouter from "./routes/health.routes";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

app.use(notFound);
app.use(errorHandler);

export default app;