const service = require("../services/dashboardService");

exports.overview = async (req, res) => {
  const data = await service.getDashboard(req.query);

  res.status(200).json({
    success: true,
    data
  });
};

exports.trends = async (req, res) => {
  const data = await service.getTrends(req.query);

  res.status(200).json({
    success: true,
    data
  });
};