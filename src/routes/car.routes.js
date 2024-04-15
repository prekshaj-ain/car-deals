import { Router } from "express";
import { verifyJWT, verifyPermission } from "../middleware/auth.middlewares.js";
import {
  getAllCars,
  getAllDealerships,
  getAllDeals,
  performDealTransaction,
} from "../controllers/car.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
const router = Router();

// * Common Routes

// view all cars
router.route("/").get(verifyJWT, getAllCars);

// * User Secific Routes
// view dealerships in certain car
router
  .route("/:id/dealerships")
  .get(verifyJWT, verifyPermission(["user"]), getAllDealerships);

// view all deals on certain car
router
  .route("/:id/deals")
  .get(verifyJWT, verifyPermission(["user"]), getAllDeals);

router
  .route("/buy")
  .post(
    upload.none(),
    verifyJWT,
    verifyPermission(["user"]),
    performDealTransaction
  );
export default router;
