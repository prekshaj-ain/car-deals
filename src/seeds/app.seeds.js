import { ObjectId } from "mongodb";
import { getDB } from "../db/index.js";
import {
  CARS_COUNT,
  MAX_CAR_PER_DEALERSHIP,
  getRandomNumber,
} from "./_constant.js";
import { faker } from "@faker-js/faker";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//  generate random cars
const cars = new Array(CARS_COUNT).fill("-").map(() => {
  return {
    type: faker.vehicle.type(),
    name: faker.vehicle.vehicle(),
    model: faker.vehicle.model(),
    car_info: {
      color: faker.vehicle.color(),
      fuel: faker.vehicle.fuel(),
      manufacturer: faker.vehicle.manufacturer(),
    },
  };
});

const seedCars = async () => {
  const db = getDB();
  await db.collection("cars").deleteMany();
  const insertedCars = await db.collection("cars").insertMany(cars);

  //   update dealerships collection by adding cars to cars list
  const dealerships = await db.collection("dealerships").find().toArray();
  const carIds = Object.values(insertedCars.insertedIds).map((id) =>
    id.toString()
  );
  for (const dealership of dealerships) {
    // Delete old cars from the dealership's cars list
    await db.collection("dealerships").updateOne(
      { _id: dealership._id },
      { $set: { cars: [] } } // Clear the cars list
    );
    const numCarsToAdd = getRandomNumber(MAX_CAR_PER_DEALERSHIP) + 1; // Add at least 1 car
    const carsToAdd = [];
    // Generate multiple random cars to add to this dealership
    for (let i = 0; i < numCarsToAdd; i++) {
      const randomCarIndex = getRandomNumber(CARS_COUNT);
      const randomCarId = carIds[randomCarIndex];
      carsToAdd.push(new ObjectId(randomCarId));
    }
    await db.collection("dealerships").updateOne(
      {
        _id: dealership._id,
      },
      { $push: { cars: { $each: carsToAdd } } }
    );
  }
};

const seedDeals = async () => {
  const db = getDB();
  await db.collection("deals").deleteMany();

  // Get all cars and dealerships
  const cars = await db.collection("cars").find().toArray();
  const dealerships = await db.collection("dealerships").find().toArray();

  // Iterate over each dealership
  for (const dealership of dealerships) {
    // Delete old deals from the dealership's dealss list
    await db.collection("dealerships").updateOne(
      { _id: dealership._id },
      { $set: { deals: [] } } // Clear the cars list
    );

    // Get the cars owned by this dealership
    const dealershipCars = cars.filter((car) =>
      dealership.cars.map((id) => id.toString()).includes(car._id.toString())
    );

    // Create deals for each car
    for (const car of dealershipCars) {
      const deal = {
        car_id: car._id,
        deal_info: {
          price: +faker.commerce.price({ dec: 0, min: 2000000, max: 10000000 }),
          discount: faker.number.int({ max: 20, min: 5 }),
          description: faker.lorem.sentence(),
        },
      };

      await db.collection("deals").insertOne(deal);

      // Update the dealership to include this deal
      await db
        .collection("dealerships")
        .updateOne({ _id: dealership._id }, { $push: { deals: deal._id } });
    }
  }
};

export const seedDatabase = asyncHandler(async (req, res) => {
  await seedCars();
  await seedDeals();
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Database populated successfully"));
});
