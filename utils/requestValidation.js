const mongoose = require("mongoose");
const ApiError = require("./apiError");
const { isMoney } = require("./validators");

function checkId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(400, "INVALID_ID", "Invalid ID");
  }
}

function checkFields(body, allowed) {
  if (!body || Array.isArray(body) ||
      typeof body !== "object") {
    throw new ApiError(
      422, "VALIDATION_ERROR", "Body must be an object"
    );
  }

  const keys = Object.keys(body);

  if (
    keys.some(key => !allowed.includes(key)) ||
    allowed.some(key => !keys.includes(key))
  ) {
    throw new ApiError(
      422, "VALIDATION_ERROR",
      "Missing or unknown fields"
    );
  }
}

function checkName(name) {
  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 100
  ) {
    throw new ApiError(
      422, "VALIDATION_ERROR", "Invalid name"
    );
  }
}

function validateAccount(body) {
  checkFields(body, [
    "name", "type", "initialBalanceSatang"
  ]);

  checkName(body.name);

  if (!["CASH", "BANK", "EWALLET"].includes(body.type)) {
    throw new ApiError(
      422, "INVALID_ACCOUNT_TYPE", "Invalid account type"
    );
  }

  if (!isMoney(body.initialBalanceSatang, true)) {
    throw new ApiError(
      422, "INVALID_INITIAL_BALANCE",
      "Invalid initial balance"
    );
  }
}

function validateCategory(body) {
  checkFields(body, ["name", "type"]);
  checkName(body.name);

  if (!["INCOME", "EXPENSE"].includes(body.type)) {
    throw new ApiError(
      422, "VALIDATION_ERROR", "Invalid category type"
    );
  }
}

const {
  parseBangkokDate
} = require("./dateUtils");

function validateTransaction(body) {
  const allowed = [
    "accountId",
    "categoryId",
    "type",
    "amountSatang",
    "transactionDate",
    "note"
  ];

  if (!body || Array.isArray(body) ||
      typeof body !== "object") {
    throw new ApiError(
      422, "VALIDATION_ERROR", "Invalid request body"
    );
  }

  const keys = Object.keys(body);
  const required = allowed.filter(f => f !== "note");

  if (keys.some(k => !allowed.includes(k)) ||
      required.some(k => !keys.includes(k))) {
    throw new ApiError(
      422, "VALIDATION_ERROR",
      "Missing or unknown fields"
    );
  }

  checkId(body.accountId);
  checkId(body.categoryId);

  if (!["INCOME", "EXPENSE"].includes(body.type)) {
    throw new ApiError(
      422, "VALIDATION_ERROR",
      "Invalid transaction type"
    );
  }

  if (!isMoney(body.amountSatang)) {
    throw new ApiError(
      422, "INVALID_AMOUNT",
      "Amount must be a positive safe integer"
    );
  }

  parseBangkokDate(body.transactionDate);

  if (body.note !== undefined &&
      (typeof body.note !== "string" ||
       body.note.length > 255)) {
    throw new ApiError(
      422, "VALIDATION_ERROR", "Invalid note"
    );
  }
}

function validateBudget(body) {
  checkFields(body, [
    "categoryId",
    "month",
    "year",
    "limitSatang"
  ]);

  // ตรวจ ObjectId
  if (
    typeof body.categoryId !== "string" ||
    !mongoose.isObjectIdOrHexString(body.categoryId)
  ) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Invalid categoryId"
    );
  }

  // ตรวจเดือน
  if (!Number.isInteger(body.month) ||
      body.month < 1 || body.month > 12) {
    throw new ApiError(
      422,
      "INVALID_BUDGET_PERIOD",
      "Month must be between 1 and 12"
    );
  }

  // ตรวจปี
  if (!Number.isInteger(body.year) ||
      body.year < 2000 || body.year > 2100) {
    throw new ApiError(
      422,
      "INVALID_BUDGET_PERIOD",
      "Invalid budget year"
    );
  }

  // ตรวจวงเงิน
  if (!isMoney(body.limitSatang)) {
    throw new ApiError(
      422,
      "INVALID_BUDGET_LIMIT",
      "Budget limit must be a positive safe integer"
    );
  }
}

module.exports = {
  checkId,
  validateAccount,
  validateCategory,
  validateTransaction,
  validateBudget
};