const mongoose = require("mongoose");

const Budget = require("../models/Budget");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

const ApiError = require("../utils/apiError");
const {
  parseBangkokDate
} = require("../utils/dateUtils");

// สร้างช่วงเวลาเริ่มเดือนและเดือนถัดไป
function getMonthRange(year, month) {
  const startText =
    `${year}-${String(month).padStart(2, "0")}-01`;

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const endText =
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return {
    start: parseBangkokDate(startText),
    end: parseBangkokDate(endText)
  };
}

// ตรวจว่า Category มีจริงและเป็น EXPENSE
async function validateExpenseCategory(categoryId) {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(
      404,
      "CATEGORY_NOT_FOUND",
      "Category not found"
    );
  }

  if (category.type !== "EXPENSE") {
    throw new ApiError(
      422,
      "INVALID_BUDGET_CATEGORY",
      "Budget requires an EXPENSE category"
    );
  }

  return category;
}

// รวมรายจ่ายจริงจาก Transactions
async function calculateSpent(categoryId, year, month) {
  const { start, end } = getMonthRange(year, month);

  const result = await Transaction.aggregate([
    {
      $match: {
        categoryId: new mongoose.Types.ObjectId(
          String(categoryId)
        ),
        type: "EXPENSE",
        transactionDate: {
          $gte: start,
          $lt: end
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountSatang" }
      }
    }
  ]);

  return result[0]?.total ?? 0;
}

// แปลง Document เป็น Response พร้อมยอดใช้จริง
async function toResponse(budget) {
  const category = await Category.findById(
    budget.categoryId
  );

  const spentSatang = await calculateSpent(
    budget.categoryId,
    budget.year,
    budget.month
  );

  const remainingSatang =
    budget.limitSatang - spentSatang;

  const usagePercent = Number(
    (spentSatang / budget.limitSatang * 100).toFixed(2)
  );

  let status = "WITHIN_BUDGET";

  if (spentSatang === budget.limitSatang) {
    status = "AT_LIMIT";
  } else if (spentSatang > budget.limitSatang) {
    status = "OVER_BUDGET";
  }

  return {
    id: String(budget._id),
    categoryId: String(budget.categoryId),
    category: category ? {
      id: String(category._id),
      name: category.name,
      type: category.type
    } : null,
    month: budget.month,
    year: budget.year,
    limitSatang: budget.limitSatang,
    spentSatang,
    remainingSatang,
    usagePercent,
    status
  };
}

// อ่านและตรวจ Query Parameters
function parsePeriod(query) {
  const keys = Object.keys(query);

  if (keys.some(k => ![
    "month", "year", "categoryId"
  ].includes(k))) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Unknown query parameter"
    );
  }

  const hasMonth = query.month !== undefined;
  const hasYear = query.year !== undefined;

  if (hasMonth !== hasYear) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Month and year must be provided together"
    );
  }

  // Current Bangkok month/year
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric"
  }).formatToParts(new Date());

  const getPart = type => Number(
    nowParts.find(p => p.type === type).value
  );

  let month = getPart("month");
  let year = getPart("year");

  if (hasMonth) {
    if (
      typeof query.month !== "string" ||
      typeof query.year !== "string" ||
      !/^\d{1,2}$/.test(query.month) ||
      !/^\d{4}$/.test(query.year)
    ) {
      throw new ApiError(
        400,
        "INVALID_QUERY_PARAMETER",
        "Invalid month or year"
      );
    }

    month = Number(query.month);
    year = Number(query.year);
  }

  if (
    month < 1 || month > 12 ||
    year < 2000 || year > 2100
  ) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Month or year out of range"
    );
  }

  const filter = { month, year };

  if (query.categoryId !== undefined) {
    if (
      typeof query.categoryId !== "string" ||
      !mongoose.isObjectIdOrHexString(query.categoryId)
    ) {
      throw new ApiError(
        400, "INVALID_ID", "Invalid categoryId"
      );
    }

    filter.categoryId = query.categoryId;
  }

  return filter;
}

// GET /api/budgets
async function listBudgets(query) {
  const filter = parsePeriod(query);

  const budgets = await Budget.find(filter)
    .sort({ createdAt: 1, _id: 1 });

  return Promise.all(budgets.map(toResponse));
}

// GET /api/budgets/:id
async function getBudget(id) {
  const budget = await Budget.findById(id);

  if (!budget) {
    throw new ApiError(
      404, "BUDGET_NOT_FOUND", "Budget not found"
    );
  }

  return toResponse(budget);
}

// POST /api/budgets
async function createBudget(data) {
  await validateExpenseCategory(data.categoryId);

  const budget = await Budget.create(data);

  return toResponse(budget);
}

// PUT /api/budgets/:id
async function updateBudget(id, data) {
  const budget = await Budget.findById(id);

  if (!budget) {
    throw new ApiError(
      404, "BUDGET_NOT_FOUND", "Budget not found"
    );
  }

  await validateExpenseCategory(data.categoryId);

  budget.categoryId = data.categoryId;
  budget.month = data.month;
  budget.year = data.year;
  budget.limitSatang = data.limitSatang;

  await budget.save();

  return toResponse(budget);
}

// DELETE /api/budgets/:id
async function deleteBudget(id) {
  const budget = await Budget.findByIdAndDelete(id);

  if (!budget) {
    throw new ApiError(
      404, "BUDGET_NOT_FOUND", "Budget not found"
    );
  }

  return { id: String(budget._id) };
}

module.exports = {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget
};
