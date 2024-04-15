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
  const { deal_id: _id } = req.body;
  const db = getDB();
  if (_id.trim().length == 0) {
    throw new ApiError(400, "deal id is required");
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
    const deal = await db.collection("deals").find({ _id });
    if (!deal) {
      throw new ApiError(404, "deal not found");
    }
    if (deal.deal_info?.completed == true) {
      throw new ApiError(400, "deal is not available");
    }
    const car = await db.collection("cars").findOne({ car_id: deal.car_id });
    if (!car) {
      throw new ApiError(404, "car not found");
    }

    const dealership = await db
      .collection("dealerships")
      .findOne({ deals: deal._id });
    if (!dealership) {
      throw new ApiError(400, "dealership not found");
    }
    const dealershipHasCar = dealership.cars.some((objectId) =>
      objectId.equals(car._id)
    );
    if (!dealershipHasCar) {
      throw new ApiError(404, "Car not found in dealership inventory");
    }
    // create new sold_vehicle entry
    const sold_vehicle = {
      vehicle_id: new ObjectId(),
      car_id: car._id,
      vehicle_info: {
        sold_date: new Date(),
      },
    };
    await db.collection("sold_vehicles").insertOne(sold_vehicle, { session });
    // Add the sold_vehicle to dealership and user
    await db
      .collection("dealerships")
      .updateOne(
        { _id: new ObjectId(dealership.dealership_id) },
        { $addToSet: { sold_vehicles: sold_vehicle.vehicle_id } },
        { session }
      );
    await db
      .collection("users")
      .updateOne(
        { user_email },
        { $addToSet: { vehicle_info: sold_vehicle.vehicle_id } },
        { session }
      );
    //Remove the car from dealership's cars array
    await db
      .collection("dealerships")
      .updateOne(
        { dealership_id: new ObjectId(dealership.dealership_id) },
        { $pull: { cars: new ObjectId(car._id) } },
        { session }
      );
    // Update deal_info in deals collection
    await db
      .collection("deals")
      .updateOne(
        { _id: new ObjectId(deal._id) },
        { $set: { deal_info: { completed: true } } },
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
