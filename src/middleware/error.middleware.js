import { ApiError } from "../utils/ApiError.js";

const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of our custom ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Something went wrong on the server";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
  };

  return res.status(error.statusCode).json(response);
};

export { errorMiddleware };
