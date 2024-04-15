import { Router } from "express";
import {
  changePassword,
  login,
  logout,
  register,
} from "../controllers/auth.controllers.js";
import { verifyJWT, verifyPermission } from "../middleware/auth.middlewares.js";
import { getMyVehicles } from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// Unsecured route
router.route("/register").post(upload.none(), register);
router.route("/login").post(upload.none(), login);

// secure route
router.route("/logout").get(verifyJWT, logout);
router.route("/change-password").patch(verifyJWT, changePassword);
router
  .route("/my-vehicles")
  .get(verifyJWT, verifyPermission(["user"]), getMyVehicles);

export default router;
