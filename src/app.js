import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import userRouter from "./routes/user.routes";
import dealershipRouter from "./routes/dealership.routes";
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

export default app;
