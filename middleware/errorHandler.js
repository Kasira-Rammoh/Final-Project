const mongoose = require("mongoose");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message;

  // Invalid JSON
  if (err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Invalid JSON request";
  }

  // Mongoose validation
  else if (
    err instanceof mongoose.Error.ValidationError ||
    err.name === "StrictModeError"
  ) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = "Invalid data";
  }

  // MongoDB duplicate unique index
  else if (err.code === 11000) {
    status = 409;

    if (err.keyPattern?.categoryId &&
        err.keyPattern?.year &&
        err.keyPattern?.month) {
      code = "BUDGET_ALREADY_EXISTS";
      message = "Budget already exists for this period";
    } else if (err.keyPattern?.nameKey &&
               err.keyPattern?.type) {
      code = "CATEGORY_ALREADY_EXISTS";
      message = "Category already exists";
    } else {
      code = "DUPLICATE_VALUE";
      message = "Duplicate value";
    }
  }

  // Internal errors must not expose details
  if (status === 500) {
    console.error(err);
    code = "INTERNAL_SERVER_ERROR";
    message = "Internal server error";
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: []
    }
  });
}

module.exports = errorHandler;
