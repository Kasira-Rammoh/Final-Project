require("dotenv").config();

const mongoose = require("mongoose");
const Category = require("../models/Category");

const defaults = [
  { name: "เงินเดือน", type: "INCOME" },
  { name: "รายได้พิเศษ", type: "INCOME" },
  { name: "เงินสนับสนุน", type: "INCOME" },
  { name: "รายได้อื่น ๆ", type: "INCOME" },
  { name: "อาหาร", type: "EXPENSE" },
  { name: "เดินทาง", type: "EXPENSE" },
  { name: "ช้อปปิ้ง", type: "EXPENSE" },
  { name: "ค่าที่พัก", type: "EXPENSE" },
  { name: "ค่าใช้จ่ายอื่น ๆ", type: "EXPENSE" }
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Category.init();

    const count = await Category.countDocuments();

    if (count > 0) {
      console.log("Categories already exist. Skipping seed.");
      return;
    }

    await Category.create(defaults);

    console.log("Created 9 default categories.");
  } finally {
    await mongoose.disconnect();
  }
}

seedCategories().catch(error => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
