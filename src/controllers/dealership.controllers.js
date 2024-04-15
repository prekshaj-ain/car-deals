import { getDB } from "../db/index.js";
import mongodb, { ObjectId } from "mongodb";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const addCar = asyncHandler(async (req, res) => {
  const { type, name, model, car_info } = req.body;
  if ([type, name, model].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "type, name, model is required");
  }
  const dealership_email = req.user?.id;
  const db = getDB();
  // create a new car
  const newCar = {
    type,
    name,
    model,
    car_info: { ...car_info },
  };
  const car = await db.collection("cars").insertOne(newCar);
  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_email });
  if (!dealership) {
    throw new ApiError(404, "dealership not found");
  }
  // Add the car to the dealership's cars list
  await db
    .collection("dealerships")
    .updateOne({ dealership_email }, { $push: { cars: car.insertedId } });
  res
    .status(200)
    .json(new ApiResponse(200, newCar, "Car added to dealership successfully"));
});

export const addDeal = asyncHandler(async (req, res) => {
  const { car_id, deal_info } = req.body;
  const dealership_email = req.user?.id;

  const db = getDB();

  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_email });
  if (!dealership) {
    throw new ApiError(404, "Dealership not found");
  }
  // Check if the car exists in the dealership's cars
  const carIdToCheck = new ObjectId(car_id);

  const carExists = dealership.cars.some((objectId) =>
    objectId.equals(carIdToCheck)
  );

  if (!carExists) {
    throw new ApiError(400, "Car not found in dealership's inventory");
  }
  // Create a new deal
  const newDeal = {
    car_id,
    deal_info: { ...deal_info },
  };

  // Insert the new deal into the deals collection
  const deal = await db.collection("deals").insertOne(newDeal);

  //   add the deal to dealership deals list
  await db
    .collection("dealerships")
    .updateOne({ dealership_email }, { $push: { deals: deal.insertedId } });

  res
    .status(200)
    .json(
      new ApiResponse(200, { newDeal }, "Deal added to dealership successfully")
    );
});

export const getSoldVehicles = asyncHandler(async (req, res) => {
  const dealership_email = req.user?.id;
  const db = getDB();

  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_email });
  if (!dealership) {
    throw new ApiError(404, "Dealership not found");
  }
  const soldVehicleIds = dealership.sold_vehicles;
  const soldVehiclesWithOwners = await db
    .collection("sold_vehicles")
    .aggregate([
      {
        $match: {
          vehicle_id: { $in: soldVehicleIds }, // Match sold vehicle's vehicle_id with vehicle_info list of IDs
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "vehicle_id",
          foreignField: "vehicle_info",
          as: "owner_info",
        },
      },
      {
        $addFields: {
          owner_info: {
            $first: "$owner_info",
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id field from results
          vehicle_info: 1,
          owners_info: 1,
        },
      },
    ])
    .toArray();
  // Send the results in the response
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        soldVehiclesWithOwners,
        "Sold vehicles with owner info fetched successfully"
      )
    );
});

export const getDealsFromDealership = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_id: new ObjectId(id) });
  if (!dealership) {
    throw new ApiError(404, "Dealership not found");
  }
  const dealIds = dealership.deals;

  // Fetch all deals from the deals collection where deal_id matches any of the ObjectId values
  const dealsFromDealership = await db
    .collection("deals")
    .find({
      deal_id: { $in: dealIds },
    })
    .toArray();

  res
    .status(200)
    .json(
      new ApiResponse(200, dealsFromDealership, "Deals fetched Successfully")
    );
});

export const getCarsFromDealership = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_id: new ObjectId(id) });
  if (!dealership) {
    throw new ApiError(404, "Dealership not found");
  }
  const carIds = dealership.cars;
  // Fetch all cars from the deals collection where _id matches any of the ObjectId values
  const carsFromDealership = await db
    .collection("cars")
    .find({
      _id: { $in: carIds },
    })
    .toArray();

  res
    .status(200)
    .json(
      new ApiResponse(200, carsFromDealership, "Cars fetched Successfully")
    );
});
