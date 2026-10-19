const mongoose = require("mongoose");
const { isMoney } = require("../utils/validators");

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ["CASH", "BANK", "EWALLET"]
  },
  initialBalanceSatang: {
    type: Number,
    required: true,
    validate: {
      validator: v => isMoney(v, true),
      message: "Invalid initial balance"
    }
  }
}, {
  timestamps: true,
  strict: "throw"
});

module.exports = mongoose.model("Account", accountSchema);
