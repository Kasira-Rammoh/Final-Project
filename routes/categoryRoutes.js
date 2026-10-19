const router = require("express").Router();
const controller = require("../controllers/categoryController");
const ApiError = require("../utils/apiError");

const {
  checkId,
  validateCategory
} = require("../utils/requestValidation");

function validateId(req, res, next) {
  checkId(req.params.id);
  next();
}

function validateBody(req, res, next) {
  validateCategory(req.body);
  next();
}

function validateQuery(req, res, next) {
  const keys = Object.keys(req.query);

  if (
    keys.some(k => k !== "type") ||
    (req.query.type &&
      !["INCOME", "EXPENSE"].includes(req.query.type))
  ) {
    throw new ApiError(
      400, "INVALID_QUERY_PARAMETER",
      "Invalid category filter"
    );
  }

  next();
}

router.get("/", validateQuery, controller.list);
router.get("/:id", validateId, controller.get);
router.post("/", validateBody, controller.create);
router.put("/:id", validateId, validateBody, controller.update);
router.delete("/:id", validateId, controller.remove);

module.exports = router;
