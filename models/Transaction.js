const mongoose = require("mongoose");
const { isMoney } = require("../utils/validators");

const transactionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["INCOME", "EXPENSE"]
  },
  amountSatang: {
    type: Number,
    required: true,
    validate: {
      validator: v => isMoney(v),
      message: "Invalid amount"
    }
  },
  transactionDate: {
    type: Date,
    required: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: 255,
    default: ""
  }
}, {
  timestamps: true,
  strict: "throw"
});

transactionSchema.index({
  transactionDate: -1,
  createdAt: -1,
  _id: -1
});

transactionSchema.index({
  accountId: 1,
  transactionDate: -1
});

transactionSchema.index({
  categoryId: 1,
  type: 1,
  transactionDate: -1
});

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);
