const stockOhlc = require("../../controllers/historicalData/stockOhlc");
const router = require("express").Router();



//Stocks Opening , high , low , closing data 
router.post("/ohlc" ,  stockOhlc )




module.exports = router;
