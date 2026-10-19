const service = require("../services/reportService");

exports.summary = async (req, res) => {
  const data = await service.getSummary(req.query);

  res.status(200).json({
    success: true,
    data
  });
};

exports.categories = async (req, res) => {
  const data = await service.getCategoriesReport(req.query);

  res.status(200).json({
    success: true,
    data
  });
};

exports.monthly = async (req, res) => {
  const data = await service.getMonthlyReport(req.query);

  res.status(200).json({
    success: true,
    data
  });
};