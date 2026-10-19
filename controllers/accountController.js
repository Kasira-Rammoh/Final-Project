const service = require("../services/accountService");

exports.list = async (req, res) => {
  res.json({
    success: true,
    data: await service.listAccounts()
  });
};

exports.get = async (req, res) => {
  res.json({
    success: true,
    data: await service.getAccount(req.params.id)
  });
};

exports.create = async (req, res) => {
  const data = await service.createAccount(req.body);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data
  });
};

exports.update = async (req, res) => {
  const data = await service.updateAccount(
    req.params.id, req.body
  );

  res.json({
    success: true,
    message: "Account updated successfully",
    data
  });
};

exports.remove = async (req, res) => {
  const data = await service.deleteAccount(req.params.id);

  res.json({
    success: true,
    message: "Account deleted successfully",
    data
  });
};
