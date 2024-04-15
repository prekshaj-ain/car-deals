import { getDB } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getMyVehicles = asyncHandler(async (req, res) => {
  const user_email = req.user?.id;
  const db = getDB();
  const user = await db.collection("users").findOne({ user_email });
  if (!user) {
    throw new ApiError(404, "User Not found");
  }

  const vehicleIds = user.vehicle_info;

  // Fetch all vehicles from the cars collection where _id matches any of the vehicle IDs
  const vehiclesOwnedByUser = await db
    .collection("sold_vehicles")
    .aggregate([
      {
        $match: {
          vehicle_id: { $in: vehicleIds },
        },
      },
      {
        $lookup: {
          from: "cars",
          localField: "car_id",
          foreignField: "_id",
          as: "car_details",
        },
      },
      {
        $addFields: {
          car_details: {
            $first: "$car_details",
          },
        },
      },
      {
        $project: {
          vehicle_id: 0,
          _id: 0,
          car_id: 0,
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
        "Vehicles owned by user fetched successfully"
      )
    );
});
