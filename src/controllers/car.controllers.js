import { ObjectId } from "bson";
import { client, getDB } from "../db/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const getAllCars = asyncHandler(async (req, res) => {
  const db = getDB();
  const cars = await db.collection("cars").find();
  return res
    .status(200)
    .json(new ApiResponse(200, cars, "All cars fetched successfully"));
});

export const getAllDealerships = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const dealershipsWithCar = db
    .collection("dealerships")
    .aggregate([
      {
        $match: {
          cars: { $elemMatch: { $eq: ObjectId(id) } },
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
  const dealsWithCar = db.collection("deals").find({ car_id: id });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dealershipsWithCar,
        "Deals with the specified car fetched successfully"
      )
    );
});

export const performDealTransaction = asyncHandler(async (req, res) => {
  const { id: user_email } = req.user;
  const { deal_id } = req.body;
  const db = getDB();
  if (deal_id.trim().length == 0) {
    throw new ApiError(400, "deal id is required");
  }
  const user = await db.collection("users").findOne({ user_email });
  if (!user) {
    throw new ApiError("User not found");
  }
  // start a client session
  const transactionOptions = {
    readPreference: "primary",
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    maxCommitTimeMS: 1000,
  };
  const session = client.startSession();
  session.startTransaction(transactionOptions);
  try {
    const deal = await db.collection("deals").findOne({ deal_id });
    if (!deal) {
      throw new ApiError(404, "deal not found");
    }
    if (deal.deal_info.completed == true) {
      throw new ApiError(400, "deal is not available");
    }
    const car = await db.collection("cars").findOne({ car_id: deal.car_info });
    if (!car) {
      throw new ApiError(404, "car not found");
    }

    const dealership = await db
      .collection("dealerships")
      .findOne({ deals: deal.deal_id });
    if (!dealership) {
      throw new ApiError(400, "dealership not found");
    }
    // create new sold_vehicle entry
    const sold_vehicle = {
      vehicle_id: new ObjectId(),
      car_id: car.car_id,
      vehicle_info: {
        sold_date: new Date(),
      },
    };
    await db.collection("sold_vehicles").insertOne(sold_vehicle, { session });
    // Add the sold_vehicle to dealership and user
    await db
      .collection("dealerships")
      .updateOne(
        { _id: ObjectId(dealership.dealership_id) },
        { $addToSet: { sold_vehicles: soldVehicle.vehicle_id } },
        { session }
      );
    await db
      .collection("users")
      .updateOne(
        { _id: ObjectId(user.user_email) },
        { $addToSet: { vehicle_info: soldVehicle.vehicle_id } },
        { session }
      );
    //Remove the car from dealership's cars array
    await db
      .collection("dealerships")
      .updateOne(
        { _id: ObjectId(dealership.dealership_id) },
        { $pull: { cars: ObjectId(car.car_id) } },
        { session }
      );
    // Update deal_info in deals collection
    await db
      .collection("deals")
      .updateOne(
        { _id: ObjectId(deal_id) },
        { $set: { "deal_info.completed": true } },
        { session }
      );
    // Commit the transaction
    await session.commitTransaction();

    console.log("Transaction committed successfully");
  } catch (err) {
    await session.abortTransaction();
    console.error("Transaction aborted:", err.message);
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
