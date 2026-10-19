const router = require("express").Router();
const controller = require("../controllers/budgetController");

const {
  checkId,
  validateBudget
} = require("../utils/requestValidation");

function validateId(req, res, next) {
  checkId(req.params.id);
  next();
}

function validateBody(req, res, next) {
  validateBudget(req.body);
  next();
}

router.get("/", controller.list);

router.get("/:id", validateId, controller.get);

router.post("/", validateBody, controller.create);

router.put(
  "/:id",
  validateId,
  validateBody,
  controller.update
);

router.delete("/:id", validateId, controller.remove);

module.exports = router;
