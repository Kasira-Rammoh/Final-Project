const router = require("express").Router();

const controller = require(
  "../controllers/reportController"
);

router.get("/summary", controller.summary);
router.get("/categories", controller.categories);
router.get("/monthly", controller.monthly);

module.exports = router;