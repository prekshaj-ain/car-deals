import { getDB } from "../db";
import { ObjectId } from "bson";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const addCar = asyncHandler(async (req, res) => {
  const { type, name, model, car_info } = req.body;
  const dealership_email = req.user?.id;
  const db = getDB();
  // create a new car
  const newCar = {
    car_id: new ObjectId(),
    type,
    name,
    model,
    car_info,
  };
  await db.collection("cars").insertOne(newCar);

  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_email });
  if (!dealership) {
    throw new ApiError(404, "dealership not found");
  }
  // Add the car to the dealership's cars list
  await db
    .collection("dealerships")
    .updateOne({ dealership_email }, { $push: { cars: newCar.car_id } });
  res
    .status(200)
    .json(
      new ApiResponse(200, { newCar }, "Car added to dealership successfully")
    );
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
  const carExists = dealership.cars.includes(car_id);
  if (!carExists) {
    throw new ApiError(400, "Car not found in dealership's inventory");
  }
  // Create a new deal
  const newDeal = {
    deal_id: new ObjectId(),
    car_id,
    deal_info,
  };

  // Insert the new deal into the deals collection
  await db.collection("deals").insertOne(newDeal);

  //   add the deal to dealership deals list
  await db
    .collection("dealerships")
    .updateOne({ dealership_email }, { $push: { deals: newDeal.deal_id } });

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
  const vehicleObjectIds = soldVehicleIds.map((id) => ObjectId(id));
  const soldVehiclesWithOwners = await db
    .collection("sold_vehicles")
    .aggregate([
      {
        $match: {
          vehicle_id: { $in: vehicleInfoObjectIds }, // Match sold vehicle's vehicle_id with vehicle_info list of IDs
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "vehicle_id",
          foreignField: "vehicle_info",
          as: "owners_info", // Assuming multiple owners per vehicle are possible
        },
      },
      {
        $addField: {
          owners_info: {
            $first: "$owners_info",
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id field from results
          vehicle_id: 1,
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
        "Sold vehicles with owner info retrieved successfully"
      )
    );
});

export const getDealsFromDealership = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_id: ObjectId(id) });
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
  const dealership = await db
    .collection("dealerships")
    .findOne({ dealership_id: ObjectId(id) });
  if (!dealership) {
    throw new ApiError(404, "Dealership not found");
  }
  const carIds = dealership.cars;
  // Fetch all cars from the deals collection where car_id matches any of the ObjectId values
  const carsFromDealership = await db
    .collection("cars")
    .find({
      car_id: { $in: carIds },
    })
    .toArray();

  res
    .status(200)
    .json(
      new ApiResponse(200, carsFromDealership, "Cars fetched Successfully")
    );
});
