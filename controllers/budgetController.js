const service = require("../services/budgetService");

exports.list = async (req, res) => {
  const data = await service.listBudgets(req.query);

  res.status(200).json({
    success: true,
    data
  });
};

exports.get = async (req, res) => {
  const data = await service.getBudget(req.params.id);

  res.status(200).json({
    success: true,
    data
  });
};

exports.create = async (req, res) => {
  const data = await service.createBudget(req.body);

  res.status(201).json({
    success: true,
    message: "Budget created successfully",
    data
  });
};

exports.update = async (req, res) => {
  const data = await service.updateBudget(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Budget updated successfully",
    data
  });
};

exports.remove = async (req, res) => {
  const data = await service.deleteBudget(req.params.id);

  res.status(200).json({
    success: true,
    message: "Budget deleted successfully",
    data
  });
};
