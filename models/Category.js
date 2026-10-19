const mongoose = require("mongoose");
const { normalizeName } = require("../utils/validators");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  nameKey: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["INCOME", "EXPENSE"]
  }
}, {
  timestamps: true,
  strict: "throw"
});

categorySchema.pre("validate", function () {
  if (typeof this.name === "string") {
    this.nameKey = normalizeName(this.name);
  }
});

categorySchema.index(
  { type: 1, nameKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Category", categorySchema);
