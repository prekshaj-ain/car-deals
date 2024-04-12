import { Router } from "express";
import { verifyJWT, verifyPermission } from "../middleware/auth.middlewares";
import {
  addCar,
  addDeal,
  getCarsFromDealership,
  getDealsFromDealership,
  getSoldVehicles,
} from "../controllers/dealership.controllers";

const router = Router();

// * common Routes

// View all deals from a certain dealership
router.route("/:id/deals").get(verifyJWT, getDealsFromDealership);

// View cars in a certain dealership
router.route("/:id/cars").get(verifyJWT, getCarsFromDealership);

// * Dealership Specific Routes

// Add cars to dealership
router.route("/cars").post(verifyJWT, verifyPermission(["dealer"]), addCar);

// Add deals to dealership
router.route("/deals").post(verifyJWT, verifyPermission(["dealer"]), addDeal);

// View all vehicles sold by a dealership
router
  .route("/sold-vehicles")
  .get(verifyJWT, verifyPermission(["dealer"]), getSoldVehicles);

export default router;
