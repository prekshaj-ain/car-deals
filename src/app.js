import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import dealershipRouter from "./routes/dealership.routes.js";
import carRouter from "./routes/car.routes.js";
import { errorHandler } from "./utils/errorHandler.js";
const app = express();

app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN === "*"
        ? "*"
        : process.env.CORS_ORIGIN?.split(","),
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // configure static file to save images locally
app.use(cookieParser());

// routes
app.use("/api/users", userRouter);
app.use("/api/dealerships", dealershipRouter);
app.use("/api/cars", carRouter);

app.use(errorHandler);

export default app;
