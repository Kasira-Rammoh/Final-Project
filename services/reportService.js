const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

const ApiError = require("../utils/apiError");

const {
  checkQuery,
  parseDateRange,
  parseYear
} = require("../utils/analyticsQuery");

const {
  safeNumber,
  summarizeTransactions,
  monthlySeries
} = require("./analyticsService");

// GET /api/reports/summary
async function getSummary(query) {
  checkQuery(query, ["startDate", "endDate"]);

  const period = parseDateRange(query);

  const totals = await summarizeTransactions(
    period.start,
    period.end
  );

  return {
    period: {
      startDate: period.startDate,
      endDate: period.endDate
    },
    ...totals
  };
}

// GET /api/reports/categories
async function getCategoriesReport(query) {
  checkQuery(query, [
    "startDate", "endDate", "type"
  ]);

  const period = parseDateRange(query);

  if (
    query.type !== undefined &&
    !["INCOME", "EXPENSE"].includes(query.type)
  ) {
    throw new ApiError(
      400,
      "INVALID_QUERY_PARAMETER",
      "Invalid transaction type"
    );
  }

  const match = {
    transactionDate: {
      $gte: period.start,
      $lt: period.end
    }
  };

  if (query.type !== undefined) {
    match.type = query.type;
  }

  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          categoryId: "$categoryId",
          type: "$type"
        },
        totalSatang: { $sum: "$amountSatang" },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalSatang: -1 }
    }
  ]);

  const categories = await Category.find({
    _id: {
      $in: rows.map(r => r._id.categoryId)
    }
  }).lean();

  const categoryMap = new Map(
    categories.map(c => [
      String(c._id), c.name
    ])
  );

  // คำนวณยอดรวมแยกตามประเภท
  const totalsByType = new Map();

  for (const row of rows) {
    const type = row._id.type;
    const previous = totalsByType.get(type) ?? 0;

    totalsByType.set(
      type,
      safeNumber(previous + row.totalSatang)
    );
  }

  const data = rows.map(row => {
    const type = row._id.type;
    const typeTotal = totalsByType.get(type) ?? 0;

    const percentage = typeTotal === 0
      ? 0
      : Number(
          (row.totalSatang / typeTotal * 100).toFixed(2)
        );

    return {
      categoryId: String(row._id.categoryId),
      categoryName: categoryMap.get(
        String(row._id.categoryId)
      ) ?? null,
      type,
      totalSatang: safeNumber(row.totalSatang),
      transactionCount: row.transactionCount,
      percentage
    };
  });

  return {
    period: {
      startDate: period.startDate,
      endDate: period.endDate
    },
    type: query.type ?? "ALL",
    data
  };
}

// GET /api/reports/monthly
async function getMonthlyReport(query) {
  checkQuery(query, ["year"]);

  const year = parseYear(query);
  const data = await monthlySeries(year, 12, 12);

  let incomeSatang = 0;
  let expenseSatang = 0;
  let transactionCount = 0;

  for (const item of data) {
    incomeSatang = safeNumber(
      incomeSatang + item.incomeSatang
    );

    expenseSatang = safeNumber(
      expenseSatang + item.expenseSatang
    );

    transactionCount += item.transactionCount;
  }

  return {
    year,
    data,
    totals: {
      incomeSatang,
      expenseSatang,
      netSatang: safeNumber(
        incomeSatang - expenseSatang
      ),
      transactionCount
    }
  };
}

module.exports = {
  getSummary,
  getCategoriesReport,
  getMonthlyReport
};