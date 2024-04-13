import { Router } from "express";
import {
  changePassword,
  login,
  logout,
  register,
} from "../controllers/auth.controllers.js";
import { verifyJWT, verifyPermission } from "../middleware/auth.middlewares.js";
import { getMyVehicles } from "../controllers/user.controllers.js";

const router = Router();

// Unsecured route
router.route("/register").post(register);
router.route("/login").post(login);

// secure route
router.route("/logout").get(verifyJWT, logout);
router.route("/change-password").patch(verifyJWT, changePassword);
router
  .route("/my-vehicles")
  .get(verifyJWT, verifyPermission(["user"]), getMyVehicles);

export default router;
