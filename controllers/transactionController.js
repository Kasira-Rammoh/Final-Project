const service = require("../services/transactionService");

exports.list = async (req, res) => {
  const result = await service.listTransactions(req.query);

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
};

exports.get = async (req, res) => {
  const data = await service.getTransaction(req.params.id);

  res.json({ success: true, data });
};

exports.create = async (req, res) => {
  const data = await service.createTransaction(req.body);

  res.status(201).json({
    success: true,
    message: "Transaction created successfully",
    data
  });
};

exports.update = async (req, res) => {
  const data = await service.updateTransaction(
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    message: "Transaction updated successfully",
    data
  });
};

exports.remove = async (req, res) => {
  const data = await service.deleteTransaction(req.params.id);

  res.json({
    success: true,
    message: "Transaction deleted successfully",
    data
  });
};
