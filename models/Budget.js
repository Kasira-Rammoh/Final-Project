const mongoose = require("mongoose");
const { isMoney } = require("../utils/validators");

const budgetSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    validate: Number.isInteger
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
    validate: Number.isInteger
  },
  limitSatang: {
    type: Number,
    required: true,
    validate: {
      validator: v => isMoney(v),
      message: "Invalid budget limit"
    }
  }
}, {
  timestamps: true,
  strict: "throw"
});

budgetSchema.index(
  { categoryId: 1, year: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model("Budget", budgetSchema);
