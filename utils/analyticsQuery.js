const ApiError = require("./apiError");

const {
  parseBangkokDate,
  nextBangkokDay
} = require("./dateUtils");

function checkQuery(query, allowed) {
  if (Object.keys(query).some(
    key => !allowed.includes(key)
  )) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Unknown query parameter"
    );
  }
}

function parseNumber(value, name, min, max) {
  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value)
  ) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      `Invalid ${name}`
    );
  }

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  ) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      `Invalid ${name}`
    );
  }

  return number;
}

function currentBangkokPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric"
  }).formatToParts(new Date());

  const value = type => Number(
    parts.find(p => p.type === type).value
  );

  return {
    month: value("month"),
    year: value("year")
  };
}

function parseMonthYear(query) {
  const hasMonth = query.month !== undefined;
  const hasYear = query.year !== undefined;

  if (hasMonth !== hasYear) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Specify both month and year"
    );
  }

  if (!hasMonth) {
    return currentBangkokPeriod();
  }

  return {
    month: parseNumber(query.month, "month", 1, 12),
    year: parseNumber(query.year, "year", 2000, 2100)
  };
}

function parseYear(query) {
  if (query.year === undefined) {
    return currentBangkokPeriod().year;
  }

  return parseNumber(query.year, "year", 2000, 2100);
}

function parseDateRange(query) {
  if (
    typeof query.startDate !== "string" ||
    typeof query.endDate !== "string"
  ) {
    throw new ApiError(
      400,
      "INVALID_DATE_RANGE",
      "startDate and endDate are required"
    );
  }

  let start;
  let end;

  try {
    start = parseBangkokDate(query.startDate);
    end = nextBangkokDay(query.endDate);
  } catch {
    throw new ApiError(
      400,
      "INVALID_DATE_RANGE",
      "Invalid date range"
    );
  }

  if (start >= end) {
    throw new ApiError(
      400,
      "INVALID_DATE_RANGE",
      "startDate must not exceed endDate"
    );
  }

  return {
    startDate: query.startDate,
    endDate: query.endDate,
    start,
    end
  };
}

function monthStart(year, month) {
  const date = `${year}-${String(month).padStart(2, "0")}-01`;
  return parseBangkokDate(date);
}

module.exports = {
  checkQuery,
  parseNumber,
  parseMonthYear,
  parseYear,
  parseDateRange,
  monthStart
};