import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ACCESS_TOKEN_SECRET } from "../config/server.config";
import { getDB } from "../db";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (!decodedToken || !decodedToken.id || !decodedToken.role) {
      throw new Error("Invalid token data");
    }
    const db = getDB();
    const { id, role } = decodedToken;
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
      throw new ApiError(404, "User not found");
    }
    req.user = {
      id: decodedToken.id,
      role: decodedToken.role,
    };
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export const verifyPermission = (roles = []) => {
  asyncHandler(async (req, res, next) => {
    if (!req.user?.id) {
      throw new ApiError(401, "Unauthorized request");
    }
    if (roles.includes(req.user?.role)) {
      next();
    } else {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
  });
};
