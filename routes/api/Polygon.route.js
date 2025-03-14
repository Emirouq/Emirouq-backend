const router = require("express").Router();

// bring in models and controllers
const getStockTickers = require("../../controllers/polygon/getStockTickers");

// get user details
router.get("/tickers", getStockTickers);

module.exports = router;
