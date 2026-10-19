const ApiError = require("./apiError");

const DAY_MS = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseDateParts(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(
      422, "INVALID_TRANSACTION_DATE",
      "Date must use YYYY-MM-DD"
    );
  }

  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  check.setUTCHours(0, 0, 0, 0);

  if (check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day) {
    throw new ApiError(
      422, "INVALID_TRANSACTION_DATE",
      "Invalid calendar date"
    );
  }

  return { year, month, day };
}

function parseBangkokDate(value) {
  const { year, month, day } = parseDateParts(value);

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return new Date(date.getTime() - BANGKOK_OFFSET_MS);
}

function formatBangkokDate(date) {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS)
    .toISOString().slice(0, 10);
}

function nextBangkokDay(value) {
  return new Date(parseBangkokDate(value).getTime() + DAY_MS);
}

module.exports = {
  parseBangkokDate,
  formatBangkokDate,
  nextBangkokDay
};
