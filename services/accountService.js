const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const ApiError = require("../utils/apiError");

function toResponse(account, netSatang = 0) {
  const a = account.toObject();

  return {
    id: String(a._id),
    name: a.name,
    type: a.type,
    initialBalanceSatang: a.initialBalanceSatang,
    currentBalanceSatang:
      a.initialBalanceSatang + netSatang
  };
}

async function getNetBalances() {
  const rows = await Transaction.aggregate([
    {
      $group: {
        _id: "$accountId",
        net: {
          $sum: {
            $cond: [
              { $eq: ["$type", "INCOME"] },
              "$amountSatang",
              { $multiply: ["$amountSatang", -1] }
            ]
          }
        }
      }
    }
  ]);

  return new Map(rows.map(r => [String(r._id), r.net]));
}

async function listAccounts() {
  const accounts = await Account.find().sort({
    createdAt: 1, _id: 1
  });

  const balances = await getNetBalances();

  return accounts.map(a =>
    toResponse(a, balances.get(String(a._id)) || 0)
  );
}

async function getAccount(id) {
  const account = await Account.findById(id);

  if (!account) {
    throw new ApiError(
      404, "ACCOUNT_NOT_FOUND", "Account not found"
    );
  }

  const balances = await getNetBalances();

  return toResponse(
    account, balances.get(String(account._id)) || 0
  );
}

async function createAccount(data) {
  const account = await Account.create(data);
  return toResponse(account);
}

async function updateAccount(id, data) {
  const account = await Account.findById(id);

  if (!account) {
    throw new ApiError(
      404, "ACCOUNT_NOT_FOUND", "Account not found"
    );
  }

  account.name = data.name;
  account.type = data.type;
  account.initialBalanceSatang = data.initialBalanceSatang;

  await account.save();
  return getAccount(id);
}

async function deleteAccount(id) {
  const account = await Account.findById(id);

  if (!account) {
    throw new ApiError(
      404, "ACCOUNT_NOT_FOUND", "Account not found"
    );
  }

  const inUse = await Transaction.exists({ accountId: id });

  if (inUse) {
    throw new ApiError(
      409, "ACCOUNT_IN_USE",
      "Account has transactions"
    );
  }

  await Account.findByIdAndDelete(id);

  return { id };
}

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount
};
