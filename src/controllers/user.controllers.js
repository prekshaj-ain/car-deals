import { getDB } from "../db";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getMyVehicles = asyncHandler(async (req, res) => {
  const user_email = req.user?.id;
  const db = getDB();
  const user = await db.collection("users").findOne({ user_email });
  if (!user) {
    throw new ApiError(404, "User Not found");
  }

  const vehicleIds = user.vehicle_info;

  // Fetch all vehicles from the cars collection where car_id matches any of the vehicle IDs
  const vehiclesOwnedByUser = await db
    .collection("cars")
    .aggregate([
      {
        $match: {
          car_id: { $in: vehicleIds },
        },
      },
    ])
    .toArray();
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        vehiclesOwnedByUser,
        "Vehicles owned by user retrieved successfully"
      )
    );
});
