const service = require("../services/categoryService");

exports.list = async (req, res) => {
  const data = await service.listCategories(req.query.type);

  res.json({ success: true, data });
};

exports.get = async (req, res) => {
  res.json({
    success: true,
    data: await service.getCategory(req.params.id)
  });
};

exports.create = async (req, res) => {
  const data = await service.createCategory(req.body);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data
  });
};

exports.update = async (req, res) => {
  const data = await service.updateCategory(
    req.params.id, req.body
  );

  res.json({
    success: true,
    message: "Category updated successfully",
    data
  });
};

exports.remove = async (req, res) => {
  const data = await service.deleteCategory(req.params.id);

  res.json({
    success: true,
    message: "Category deleted successfully",
    data
  });
};
