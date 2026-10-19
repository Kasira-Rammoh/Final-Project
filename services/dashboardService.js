const {
  checkQuery,
  parseNumber,
  parseMonthYear,
  monthStart
} = require("../utils/analyticsQuery");

const {
  summarizeTransactions,
  calculateTotalBalance,
  monthlySeries
} = require("./analyticsService");

function nextMonth(year, month) {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }

  return { year, month: month + 1 };
}

// GET /api/dashboard
async function getDashboard(query) {
  checkQuery(query, ["month", "year"]);

  const { month, year } = parseMonthYear(query);
  const next = nextMonth(year, month);

  const [totals, balance] = await Promise.all([
    summarizeTransactions(
      monthStart(year, month),
      monthStart(next.year, next.month)
    ),
    calculateTotalBalance()
  ]);

  return {
    month,
    year,
    ...totals,
    ...balance
  };
}

// GET /api/dashboard/trends
async function getTrends(query) {
  checkQuery(query, ["month", "year", "months"]);

  const { month, year } = parseMonthYear(query);

  const months = query.months === undefined
    ? 6
    : parseNumber(query.months, "months", 1, 12);

  const data = await monthlySeries(year, month, months);

  return {
    endMonth: month,
    endYear: year,
    months,
    data
  };
}

module.exports = {
  getDashboard,
  getTrends
};