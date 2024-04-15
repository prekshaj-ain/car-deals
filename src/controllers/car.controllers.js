import { ObjectId } from "bson";
import { client, getDB } from "../db/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const getAllCars = asyncHandler(async (req, res) => {
  const db = getDB();
  const cars = await db.collection("cars").find({}).toArray();
  return res
    .status(200)
    .json(new ApiResponse(200, cars, "All cars fetched successfully"));
});

export const getAllDealerships = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const dealershipsWithCar = await db
    .collection("dealerships")
    .aggregate([
      {
        $match: {
          cars: { $elemMatch: { $eq: new ObjectId(id) } },
        },
      },
      {
        $project: {
          password: 0,
          dealership_info: 0,
        },
      },
    ])
    .toArray();
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dealershipsWithCar,
        "Dealerships with the specified car fetched successfully"
      )
    );
});

export const getAllDeals = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const dealsWithCar = await db
    .collection("deals")
    .find({ car_id: id })
    .toArray();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dealsWithCar,
        "Deals with the specified car fetched successfully"
      )
    );
});

export const performDealTransaction = asyncHandler(async (req, res) => {
  const { id: user_email } = req.user;
  const { deal_id: dealId } = req.body;
  const db = getDB();

  // Validate input
  if (!dealId.trim()) {
    throw new ApiError(400, "Deal ID is required");
  }

  const session = client.startSession();
  session.startTransaction();

  try {
    // Find the deal
    const deal = await db
      .collection("deals")
      .findOne({ _id: new ObjectId(dealId) });
    if (!deal) {
      throw new ApiError(404, "Deal not found");
    }

    // Check if deal is already completed
    if (deal.deal_info?.completed) {
      throw new ApiError(400, "Deal is not available");
    }

    // Find the dealership with the deal
    const dealership = await db
      .collection("dealerships")
      .findOne({ deals: deal._id });
    if (!dealership) {
      throw new ApiError(400, "Dealership not found");
    }

    // Validate if the car is in the dealership's inventory
    const carExistsInInventory = dealership.cars.some((objId) =>
      objId.equals(deal.car_id)
    );
    if (!carExistsInInventory) {
      throw new ApiError(404, "Car not found in dealership inventory");
    }

    // Create a new sold vehicle entry
    const sold_vehicle = {
      vehicle_id: new ObjectId(),
      car_id: new Object(deal.car_id),
      vehicle_info: { sold_date: new Date() },
    };
    await db.collection("sold_vehicles").insertOne(sold_vehicle, { session });

    // Add the sold vehicle to dealership and user
    await db.collection("dealerships").updateOne(
      { _id: new ObjectId(dealership._id) },
      {
        $addToSet: { sold_vehicles: sold_vehicle.vehicle_id },
        $pull: { cars: new ObjectId(deal.car_id) },
      },
      { session }
    );

    await db
      .collection("users")
      .updateOne(
        { user_email },
        { $addToSet: { vehicle_info: sold_vehicle.vehicle_id } },
        { session }
      );

    // Update deal_info to mark deal as completed
    await db
      .collection("deals")
      .updateOne(
        { _id: new ObjectId(deal._id) },
        { $set: { "deal_info.completed": true } },
        { session }
      );

    // Commit the transaction
    await session.commitTransaction();

    console.log("Transaction committed successfully");
  } catch (err) {
    await session.abortTransaction();
    if (err instanceof ApiError) {
      throw new ApiError(err.statusCode, err.message);
    } else {
      throw new ApiError(500, err.message);
    }
  } finally {
    await session.endSession();
  }
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Deal transaction performed successfully"));
});
