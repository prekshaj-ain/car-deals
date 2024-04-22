import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import fs from "fs";
import { ADMINS_COUNT, DEALERSHIPS_COUNT, USERS_COUNT } from "./_constant.js";
import { getDB } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Array of fake users
const users = new Array(USERS_COUNT).fill("_").map(() => ({
  user_email: faker.internet.email(),
  user_location: faker.location.city(),
  password: faker.internet.password(),
  user_info: {},
  vehicle_info: [],
}));

// Array of fake dealerships
const dealerships = new Array(DEALERSHIPS_COUNT).fill("_").map(() => ({
  dealership_email: faker.internet.email(),
  dealership_name: faker.internet.userName(),
  dealership_location: faker.location.city(),
  password: faker.internet.password(),
  dealership_info: {},
  cars: [],
  deals: [],
  sold_vehicles: [],
}));

// Array of fake admins
const admins = new Array(ADMINS_COUNT).fill("_").map(() => ({
  admin_id: faker.internet.email(),
  password: faker.internet.password(),
}));

export const seedUsers = asyncHandler(async (req, res, next) => {
  const db = getDB();
  const userCount = await db.collection("users").countDocuments();
  const adminCount = await db.collection("admins").countDocuments();
  const dealershipCount = await db.collection("dealerships").countDocuments();
  if (
    userCount >= USERS_COUNT &&
    adminCount >= ADMINS_COUNT &&
    dealershipCount >= DEALERSHIPS_COUNT
  ) {
    // Don't re-generate the users if we already have them in the database
    next();
    return;
  }
  await db.collection("users").deleteMany();
  await db.collection("dealerships").deleteMany();
  await db.collection("admins").deleteMany();
  const credentials = {
    USERS: [],
    ADMINS: [],
    DEALERSHIPS: [],
  };

  // create Promise array
  const userCreationPromise = users.map(async (user) => {
    credentials.USERS.push({
      user_email: user.user_email,
      password: user.password,
    });
    user.password = await bcrypt.hash(user.password, 10);
    await db.collection("users").insertOne(user);
  });
  const adminCreationPromise = admins.map(async (admin) => {
    credentials.ADMINS.push({
      admin_id: admin.admin_id,
      password: admin.password,
    });
    admin.password = await bcrypt.hash(admin.password, 10);
    await db.collection("admins").insertOne(admin);
  });
  const dealershipCreationPromise = dealerships.map(async (dealership) => {
    credentials.DEALERSHIPS.push({
      dealership_email: dealership.dealership_email,
      password: dealership.password,
    });
    dealership.password = await bcrypt.hash(dealership.password, 10);
    await db.collection("dealerships").insertOne(dealership);
  });

  // pass promises array to the Promise.all method
  await Promise.all([
    ...userCreationPromise,
    ...adminCreationPromise,
    ...dealershipCreationPromise,
  ]);

  // Once users are created dump the credentials to the json file
  const json = JSON.stringify(credentials);

  fs.writeFileSync(
    "./public/temp/seed-credentials.json",
    json,
    "utf8",
    (err) => {
      console.log("Error while writing the credentials", err);
    }
  );

  // proceed with the request
  next();
});

/**
 * @description This api gives the saved credentials generated while seeding.
 */
export const getGeneratedCredentials = asyncHandler(async (req, res) => {
  try {
    const json = fs.readFileSync("./public/temp/seed-credentials.json", "utf8");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(json),
          "Dummy credentials fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      404,
      "No credentials generated yet. Make sure you have seeded api data first which generates users as dependencies."
    );
  }
});
