import { ApiError } from "./ApiError.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Check if the error is an instance of an ApiError class which extends native Error class
  if (!(error instanceof ApiError)) {
    // if not
    // create a new ApiError instance to keep the consistency

    // assign an appropriate status code
    const statusCode = error.statusCode || 500;

    // set a message from native Error instance or a custom one
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message);
  }

  const response = {
    ...error,
    message: error.message,
  };

  return res.status(error.statusCode).json(response);
};
