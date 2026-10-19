const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const ApiError = require("../utils/apiError");

function toResponse(c) {
  return {
    id: String(c._id),
    name: c.name,
    type: c.type
  };
}

async function checkUsage(id) {
  const [transaction, budget] = await Promise.all([
    Transaction.exists({ categoryId: id }),
    Budget.exists({ categoryId: id })
  ]);

  return Boolean(transaction || budget);
}

async function listCategories(type) {
  const filter = type ? { type } : {};

  const items = await Category.find(filter).sort({
    type: 1, nameKey: 1
  });

  return items.map(toResponse);
}

async function getCategory(id) {
  const item = await Category.findById(id);

  if (!item) {
    throw new ApiError(
      404, "CATEGORY_NOT_FOUND", "Category not found"
    );
  }

  return toResponse(item);
}

async function createCategory(data) {
  const item = await Category.create(data);
  return toResponse(item);
}

async function updateCategory(id, data) {
  const item = await Category.findById(id);

  if (!item) {
    throw new ApiError(
      404, "CATEGORY_NOT_FOUND", "Category not found"
    );
  }

  if (item.type !== data.type && await checkUsage(id)) {
    throw new ApiError(
      409, "CATEGORY_TYPE_LOCKED",
      "Cannot change type of a category in use"
    );
  }

  item.name = data.name;
  item.type = data.type;

  // pre-validate hook generates nameKey
  await item.save();

  return toResponse(item);
}

async function deleteCategory(id) {
  const item = await Category.findById(id);

  if (!item) {
    throw new ApiError(
      404, "CATEGORY_NOT_FOUND", "Category not found"
    );
  }

  if (await checkUsage(id)) {
    throw new ApiError(
      409, "CATEGORY_IN_USE",
      "Category has transactions or budgets"
    );
  }

  await Category.findByIdAndDelete(id);

  return { id };
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
