const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const ApiError = require("../utils/apiError");
const { monthStart } = require("../utils/analyticsQuery");

function safeNumber(value) {
  if (!Number.isSafeInteger(value)) {
    throw new ApiError(
      500,
      "CALCULATION_OVERFLOW",
      "Calculated amount exceeds safe integer range"
    );
  }

  return value;
}

function summarizeRows(rows) {
  const income = rows.find(r => r._id === "INCOME");
  const expense = rows.find(r => r._id === "EXPENSE");

  const incomeSatang = safeNumber(income?.total ?? 0);
  const expenseSatang = safeNumber(expense?.total ?? 0);

  const incomeCount = income?.count ?? 0;
  const expenseCount = expense?.count ?? 0;

  return {
    incomeSatang,
    expenseSatang,
    netSatang: safeNumber(incomeSatang - expenseSatang),
    incomeCount,
    expenseCount,
    transactionCount: incomeCount + expenseCount
  };
}

// สรุปรายรับและรายจ่ายในช่วงวันที่
async function summarizeTransactions(start, end) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        transactionDate: {
          $gte: start,
          $lt: end
        }
      }
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amountSatang" },
        count: { $sum: 1 }
      }
    }
  ]);

  return summarizeRows(rows);
}

// คำนวณยอดเงินคงเหลือรวมของทุกบัญชี
// ใช้ Transactions ทั้งหมด รวมวันที่อนาคต
async function calculateTotalBalance() {
  const [accountRows, transactionRows] = await Promise.all([
    Account.aggregate([
      {
        $group: {
          _id: null,
          totalInitial: { $sum: "$initialBalanceSatang" },
          accountCount: { $sum: 1 }
        }
      }
    ]),

    Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amountSatang" },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const initialBalanceSatang = safeNumber(
    accountRows[0]?.totalInitial ?? 0
  );

  const totals = summarizeRows(transactionRows);

  return {
    accountCount: accountRows[0]?.accountCount ?? 0,
    totalBalanceSatang: safeNumber(
      initialBalanceSatang + totals.netSatang
    )
  };
}

// เลื่อนเดือน เช่น ตุลาคม - 1 = กันยายน
function shiftMonth(year, month, offset) {
  const date = new Date(
    Date.UTC(year, month - 1 + offset, 1)
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
}

// ดึงข้อมูลหลายเดือน และเติมเดือนที่ไม่มีรายการด้วย 0
async function monthlySeries(endYear, endMonth, numberOfMonths) {
  const first = shiftMonth(
    endYear, endMonth, -(numberOfMonths - 1)
  );

  const next = shiftMonth(endYear, endMonth, 1);

  const rows = await Transaction.aggregate([
    {
      $match: {
        transactionDate: {
          $gte: monthStart(first.year, first.month),
          $lt: monthStart(next.year, next.month)
        }
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: {
              date: "$transactionDate",
              timezone: "Asia/Bangkok"
            }
          },
          month: {
            $month: {
              date: "$transactionDate",
              timezone: "Asia/Bangkok"
            }
          },
          type: "$type"
        },
        total: { $sum: "$amountSatang" },
        count: { $sum: 1 }
      }
    }
  ]);

  const data = [];

  for (let i = 0; i < numberOfMonths; i++) {
    const period = shiftMonth(
      first.year, first.month, i
    );

    data.push({
      year: period.year,
      month: period.month,
      incomeSatang: 0,
      expenseSatang: 0,
      netSatang: 0,
      transactionCount: 0
    });
  }

  const lookup = new Map(
    data.map(item => [
      `${item.year}-${item.month}`,
      item
    ])
  );

  for (const row of rows) {
    const key = `${row._id.year}-${row._id.month}`;
    const item = lookup.get(key);

    if (!item) continue;

    if (row._id.type === "INCOME") {
      item.incomeSatang = safeNumber(row.total);
    } else if (row._id.type === "EXPENSE") {
      item.expenseSatang = safeNumber(row.total);
    }

    item.transactionCount += row.count;
  }

  for (const item of data) {
    item.netSatang = safeNumber(
      item.incomeSatang - item.expenseSatang
    );
  }

  return data;
}

module.exports = {
  safeNumber,
  summarizeTransactions,
  calculateTotalBalance,
  monthlySeries
};