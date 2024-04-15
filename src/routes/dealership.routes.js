import { Router } from "express";
import { verifyJWT, verifyPermission } from "../middleware/auth.middlewares.js";
import {
  addCar,
  addDeal,
  getCarsFromDealership,
  getDealsFromDealership,
  getSoldVehicles,
} from "../controllers/dealership.controllers.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// * common Routes

// View all deals from a certain dealership
router.route("/:id/deals").get(verifyJWT, getDealsFromDealership);

// View cars in a certain dealership
router.route("/:id/cars").get(verifyJWT, getCarsFromDealership);

// * Dealership Specific Routes

// Add cars to dealership
router
  .route("/cars")
  .post(upload.none(), verifyJWT, verifyPermission(["dealer"]), addCar);

// Add deals to dealership
router
  .route("/deals")
  .post(upload.none(), verifyJWT, verifyPermission(["dealer"]), addDeal);

// View all vehicles sold by a dealership
router
  .route("/sold-vehicles")
  .get(verifyJWT, verifyPermission(["dealer"]), getSoldVehicles);

export default router;
