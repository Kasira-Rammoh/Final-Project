const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const ApiError = require("../utils/apiError");

const {
  parseBangkokDate,
  formatBangkokDate,
  nextBangkokDay
} = require("../utils/dateUtils");

function toResponse(item) {
  return {
    id: String(item._id),
    accountId: String(item.accountId),
    categoryId: String(item.categoryId),
    type: item.type,
    amountSatang: item.amountSatang,
    transactionDate: formatBangkokDate(item.transactionDate),
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function validateReferences(data) {
  const [account, category] = await Promise.all([
    Account.findById(data.accountId),
    Category.findById(data.categoryId)
  ]);

  if (!account) {
    throw new ApiError(
      404, "ACCOUNT_NOT_FOUND", "Account not found"
    );
  }

  if (!category) {
    throw new ApiError(
      404, "CATEGORY_NOT_FOUND", "Category not found"
    );
  }

  if (category.type !== data.type) {
    throw new ApiError(
      422, "CATEGORY_TYPE_MISMATCH",
      "Transaction type does not match category"
    );
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseInteger(value, defaultValue, min, max) {
  if (value === undefined) return defaultValue;

  if (typeof value !== "string" ||
      !/^\d+$/.test(value)) {
    throw new ApiError(
      400, "INVALID_QUERY_PARAMETER",
      "Invalid numeric parameter"
    );
  }

  const result = Number(value);

  if (!Number.isSafeInteger(result) ||
      result < min || result > max) {
    throw new ApiError(
      400, "INVALID_QUERY_PARAMETER",
      "Numeric parameter out of range"
    );
  }

  return result;
}

async function listTransactions(query) {
  const allowed = [
    "search", "type", "accountId", "categoryId",
    "startDate", "endDate", "page", "limit", "sort"
  ];

  if (Object.keys(query).some(k => !allowed.includes(k))) {
    throw new ApiError(
      400, "INVALID_QUERY_PARAMETER",
      "Unknown query parameter"
    );
  }

  const filter = {};

  if (query.type !== undefined) {
    if (!["INCOME", "EXPENSE"].includes(query.type)) {
      throw new ApiError(
        400, "INVALID_QUERY_PARAMETER", "Invalid type"
      );
    }
    filter.type = query.type;
  }

  for (const field of ["accountId", "categoryId"]) {
    if (query[field] !== undefined) {
      if (typeof query[field] !== "string" ||
          !mongoose.isObjectIdOrHexString(query[field])) {
        throw new ApiError(
          400, "INVALID_ID", `Invalid ${field}`
        );
      }
      filter[field] = new mongoose.Types.ObjectId(query[field]);
    }
  }

  if (query.search !== undefined) {
    if (typeof query.search !== "string" ||
        query.search.length > 100) {
      throw new ApiError(
        400, "INVALID_QUERY_PARAMETER", "Invalid search"
      );
    }

    if (query.search.trim()) {
      filter.note = {
        $regex: escapeRegex(query.search.trim()),
        $options: "i"
      };
    }
  }

  if (query.startDate !== undefined ||
      query.endDate !== undefined) {
    const range = {};

    try {
      if (query.startDate !== undefined) {
        range.$gte = parseBangkokDate(query.startDate);
      }

      if (query.endDate !== undefined) {
        range.$lt = nextBangkokDay(query.endDate);
      }
    } catch {
      throw new ApiError(
        400, "INVALID_DATE_RANGE", "Invalid date range"
      );
    }

    if (range.$gte && range.$lt &&
        range.$gte >= range.$lt) {
      throw new ApiError(
        400, "INVALID_DATE_RANGE",
        "startDate must not exceed endDate"
      );
    }

    filter.transactionDate = range;
  }

  const page = parseInteger(query.page, 1, 1, 1000000);
  const limit = parseInteger(query.limit, 20, 1, 100);
  const sortDirection = query.sort === "oldest" ? 1 : -1;

  if (query.sort !== undefined &&
      !["newest", "oldest"].includes(query.sort)) {
    throw new ApiError(
      400, "INVALID_QUERY_PARAMETER", "Invalid sort"
    );
  }

  const [items, totalItems] = await Promise.all([
    Transaction.find(filter)
      .sort({
        transactionDate: sortDirection,
        createdAt: sortDirection,
        _id: sortDirection
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter)
  ]);

  const accounts = await Account.find({
    _id: { $in: items.map(x => x.accountId) }
  }).lean();

  const categories = await Category.find({
    _id: { $in: items.map(x => x.categoryId) }
  }).lean();

  const accountMap = new Map(
    accounts.map(x => [String(x._id), x.name])
  );

  const categoryMap = new Map(
    categories.map(x => [String(x._id), x])
  );

  const data = items.map(x => ({
    id: String(x._id),
    type: x.type,
    amountSatang: x.amountSatang,
    transactionDate: formatBangkokDate(x.transactionDate),
    note: x.note,
    account: {
      id: String(x.accountId),
      name: accountMap.get(String(x.accountId)) ?? null
    },
    category: {
      id: String(x.categoryId),
      name: categoryMap.get(String(x.categoryId))?.name ?? null,
      type: categoryMap.get(String(x.categoryId))?.type ?? null
    }
  }));

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0
    }
  };
}

async function getTransaction(id) {
  const item = await Transaction.findById(id);

  if (!item) {
    throw new ApiError(
      404, "TRANSACTION_NOT_FOUND",
      "Transaction not found"
    );
  }

  return toResponse(item);
}

async function createTransaction(data) {
  await validateReferences(data);

  const item = await Transaction.create({
    ...data,
    transactionDate: parseBangkokDate(data.transactionDate)
  });

  return toResponse(item);
}

async function updateTransaction(id, data) {
  const item = await Transaction.findById(id);

  if (!item) {
    throw new ApiError(
      404, "TRANSACTION_NOT_FOUND",
      "Transaction not found"
    );
  }

  await validateReferences(data);

  item.accountId = data.accountId;
  item.categoryId = data.categoryId;
  item.type = data.type;
  item.amountSatang = data.amountSatang;
  item.transactionDate = parseBangkokDate(data.transactionDate);
  item.note = data.note ?? "";

  await item.save();
  return toResponse(item);
}

async function deleteTransaction(id) {
  const item = await Transaction.findByIdAndDelete(id);

  if (!item) {
    throw new ApiError(
      404, "TRANSACTION_NOT_FOUND",
      "Transaction not found"
    );
  }

  return { id: String(item._id) };
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
