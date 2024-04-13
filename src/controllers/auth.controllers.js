import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectId } from "bson";
import {
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_SECRET,
  NODE_ENV,
} from "../config/server.config.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDB } from "../db/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const generateAccessToken = (info, role) => {
  return jwt.sign(
    {
      id: info,
      role: role,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const registerAdmin = async (req, res, db) => {
  const adminCollection = db.collection("admins");

  const { admin_id, password } = req.body;

  if ([admin_id, password].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "admin id and password is required");
  }

  // Check if user already exists
  const existingAdmin = await adminCollection.findOne({ admin_id });
  if (existingAdmin) {
    throw new ApiError(400, "Admin already exist");
  }
  // hash password
  const hashedPassword = await hashPassword(password);
  // create admin
  const newAdmin = {
    admin_id,
    password: hashedPassword,
  };
  await adminCollection.insertOne(newAdmin);
  // generate access token
  const accessToken = await generateAccessToken(admin_id, "admin");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, {}, "Admin created successfully"));
};
const registerUser = async (req, res, db) => {
  const userCollection = db.collection("users");
  const { email, password, location } = req.body;
  // validate feilds
  if ([email, password, location].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "email, password and location is required");
  }
  // check for existing user
  const existingUser = await userCollection.findOne({ user_email: email });
  if (existingUser) {
    throw new ApiError(400, "User already exist");
  }
  // hash password
  const hashedPassword = await hashPassword(password);
  // create user
  const newUser = {
    user_id: new ObjectId(),
    user_email: email,
    user_location: location,
    password: hashedPassword,
  };
  await userCollection.insertOne(newUser);
  // generate access token
  const accessToken = await generateAccessToken(email, "user");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, {}, "User created successfully"));
};

const registerDealer = async (req, res, db) => {
  const dealerCollection = db.collection("dealerships");
  const { email, password, location, name } = req.body;
  // validate feilds
  if (
    [email, password, location, name].some((field) => field.trim().length == 0)
  ) {
    throw new ApiError(400, "name, email, password and location is required");
  }
  // check for existing dealer
  const existingDealer = await dealerCollection.findOne({
    dealership_email: email,
  });
  if (existingDealer) {
    throw new ApiError(400, "Dealer already exist");
  }
  // hash password
  const hashedPassword = await hashPassword(password);
  // create dealer
  const newDealer = {
    dealership_id: new ObjectId(),
    dealership_email: email,
    dealership_location: location,
    password: hashedPassword,
    dealership_name: name,
  };
  await dealerCollection.insertOne(newDealer);
  // generate access token
  const accessToken = await generateAccessToken(email, "dealer");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, { name }, "Dealer created successfully"));
};
const loginAdmin = async (req, res, db) => {
  const adminCollection = db.collection("admins");

  const { admin_id, password } = req.body;

  if ([admin_id, password].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "admin id and password is required");
  }

  // Check if user already exists
  const existingAdmin = await adminCollection.findOne({ admin_id });
  if (!existingAdmin) {
    throw new ApiError(404, "Admin Not found");
  }
  // compare password
  const validPassword = await bcrypt.compare(password, existingAdmin.password);
  if (!validPassword) {
    throw new ApiError(400, "Invalid password");
  }
  // generate access token
  const accessToken = await generateAccessToken(admin_id, "admin");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, {}, "Admin logged in successfully"));
};
const loginUser = async (req, res, db) => {
  const userCollection = db.collection("users");
  const { email, password } = req.body;
  // validate feilds
  if ([email, password].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "email, password is required");
  }
  // check for existing user
  const existingUser = await userCollection.findOne({ user_email: email });
  if (!existingUser) {
    throw new ApiError(404, "User Not found");
  }
  // compare password
  const validPassword = await bcrypt.compare(password, existingUser.password);
  if (!validPassword) {
    throw new ApiError(400, "Invalid password");
  }
  // generate access token
  const accessToken = await generateAccessToken(email, "user");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(201, {}, "User logged in successfully"));
};

const loginDealer = async (req, res, db) => {
  const dealerCollection = db.collection("dealerships");
  const { email, password } = req.body;
  // validate feilds
  if ([email, password].some((field) => field.trim().length == 0)) {
    throw new ApiError(400, "email, password is required");
  }
  // check for existing dealer
  const existingDealer = await dealerCollection.findOne({
    dealership_email: email,
  });
  if (!existingDealer) {
    throw new ApiError(404, "Dealer Not found");
  }
  // compare password
  const validPassword = await bcrypt.compare(password, existingDealer.password);
  if (!validPassword) {
    throw new ApiError(400, "Invalid password");
  }
  // generate access token
  const accessToken = await generateAccessToken(email, "dealer");
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        201,
        { name: existingDealer.dealership_name },
        "Dealer logged in successfully"
      )
    );
};

export const register = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (role.trim().length == 0) {
    throw new ApiError(400, "role is required");
  }
  if (!["user", "admin", "dealer"].includes(role)) {
    throw new ApiError(400, "invalid role");
  }
  const db = getDB();

  switch (role) {
    case "admin":
      await registerAdmin(req, res, db);
      break;
    case "user":
      await registerUser(req, res, db);
      break;
    case "dealer":
      await registerDealer(req, res, db);
      break;
    default:
      throw new ApiError(400, "Invalid role");
  }
});

export const login = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (role.trim().length == 0) {
    throw new ApiError(400, "role is required");
  }
  if (!["user", "admin", "dealer"].includes(role)) {
    throw new ApiError(400, "invalid role");
  }
  const db = getDB();
  switch (role) {
    case "admin":
      await loginAdmin(req, res, db);
      break;
    case "user":
      await loginUser(req, res, db);
      break;
    case "dealer":
      await loginDealer(req, res, db);
      break;
    default:
      throw new ApiError(400, "Invalid role");
  }
});

export const logout = asyncHandler(async (req, res) => {
  const options = {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "Successfully logged out"));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if ([oldPassword, newPassword].some((field) => field.trim().length == 0))
    throw new ApiError(400, "old password and new password is required");
  const { role, id } = req.user;
  const db = getDB();
  let details, collection, query;
  if (role == "user") {
    collection = db.collection("users");
    query = { user_email: id };
    details = await collection.findOne(query);
  } else if (role == "dealer") {
    collection = db.collection("dealerships");
    query = { dealership_email: id };
    details = await collection.findOne(query);
  } else if (role == "admin") {
    collection = db.collection("admins");
    query = { admin_id: id };
    details = await collection.findOne(query);
  }
  if (!details) {
    throw new ApiError(404, "not found");
  }
  // Check current password
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    details.password
  );
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid current password");
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);

  // Update user's password
  await collection.updateOne(query, { $set: { password: hashedNewPassword } });

  // Invalidate old JWT by clearing access token cookie
  res.clearCookie("accessToken");

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
