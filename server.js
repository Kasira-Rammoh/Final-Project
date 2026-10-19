require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

// Middleware
app.use(express.json());

// Serve frontend files
app.use(express.static(
  path.join(__dirname, "public")
));

const accountRoutes = require("./routes/accountRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const errorHandler = require("./middleware/errorHandler");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

// Unknown API endpoint
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: "API endpoint not found",
      details: []
    }
  });
});

// Error middleware must come after routes
app.use(errorHandler);

// Test Express
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running"
  });
});

// Test MongoDB
app.get("/api/health/db", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected"
      });
    }

    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      success: true,
      message: "MongoDB is connected"
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "Database is unavailable"
    });
  }
});

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, HOST, () => {
      console.log(
        `Server running at http://${HOST}:${PORT}`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
