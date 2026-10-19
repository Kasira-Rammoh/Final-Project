const router = require("express").Router();

const controller = require(
  "../controllers/dashboardController"
);

router.get("/", controller.overview);
router.get("/trends", controller.trends);

module.exports = router;