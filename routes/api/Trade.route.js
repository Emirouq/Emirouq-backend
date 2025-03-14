const router = require("express").Router();

// bring in models and controllers
const addTrade = require("../../controllers/trade/addTrade");
const getTrade = require("../../controllers/trade/getTrades");
const deleteTrade = require("../../controllers/trade/deleteTrade");
const getSingleTrade = require("../../controllers/trade/getSingleTrade");
const realizeMultiple = require("../../controllers/trade/realizeMultiple");
const existTrade = require("../../controllers/trade/existTrade");
const quesTradeCsvUpload = require("../../controllers/trade/csv/quesTradeCsvUpload");
const interactiveBrokerCsvUpload = require("../../controllers/trade/csv/interactiveBrokerCsvUpload");
const krakenCsvUpload = require("../../controllers/trade/csv/krakenCsvUpload");
const zerodhaCsvUpload = require("../../controllers/trade/csv/zerodhaCsvUpload");
const webullCsvUpload = require("../../controllers/trade/csv/webullCsvUpload");
const eTradeCsvUpload = require("../../controllers/trade/eTradeCsvUpload");
const ninjaTraderCsvUpload = require("../../controllers/trade/csv/ninjaTraderCsvUpload");
const tc2000CsvUpload = require("../../controllers/trade/csv/tc2000CsvUpload");
const tefsEvolutionCsvUpload = require("../../controllers/trade/csv/tefsEvolutionCsvUpload");
const metaTrader4CsvUpload = require("../../controllers/trade/csv/metaTrader4CsvUpload");
const metaTrader5CsvUpload = require("../../controllers/trade/csv/metaTrader5CsvUpload");
const deleteExecutions = require("../../controllers/trade/executions/deleteExecutions");
const addExecution = require("../../controllers/trade/executions/addExecution");
const updateExecution = require("../../controllers/trade/executions/updateExecution");
const availableTimeZones = require("../../controllers/trade/availableTimeZones");
const addNotes = require("../../controllers/trade/addNotes");
const addTags = require("../../controllers/trade/addTags");
const splitTrades = require("../../controllers/trade/splitTrade");
const makeAsBreakEven = require("../../controllers/trade/csv/makeAsBreakEven");
const updateTrade = require("../../controllers/trade/updateTrade");
router.get("/timeZone", availableTimeZones);
//ques trade csv upload
router.post("/ques-trade/csv/upload", quesTradeCsvUpload);
//ibkr csv upload
router.post("/interactiveBroker/csv/upload", interactiveBrokerCsvUpload);
//mt4 csv upload
router.post("/mt4/csv/upload", metaTrader4CsvUpload);
//mt5 csv upload
router.post("/mt5/csv/upload", metaTrader5CsvUpload);
//webull csv upload
router.post("/webull/csv/upload", webullCsvUpload);
//etrade csv upload
router.post("/eTrade/csv/upload", eTradeCsvUpload);
//ninjaTrader csv upload
router.post("/ninjaTrader/csv/upload", ninjaTraderCsvUpload);
//tc2000 csv upload
router.post("/tc2000/csv/upload", tc2000CsvUpload);
//tefsEvolution csv upload
router.post("/tefsEvolution/csv/upload", tefsEvolutionCsvUpload);
//kraken csv upload
router.post("/kraken/csv/upload", krakenCsvUpload);
//zerodha csv upload
router.post("/zerodha/csv/upload", zerodhaCsvUpload);
router.get("/exist/:symbol", existTrade);
router.post("/", addTrade);
router.get("/", getTrade);
router.delete("/", deleteTrade);
router.put("/tags/:tradeId", addTags);
// ad notes
router.put("/:tradeId/add-notes", addNotes);
router.get("/:id", getSingleTrade);
router.put("/:tradeId", updateTrade);

router.put("/:tradeId/execution", addExecution);
router.delete("/:tradeId/execution", deleteExecutions);
router.put("/:tradeId/execution/:executionId", updateExecution);
router.put("/:tradeId/create/realized-multiple", realizeMultiple);
router.put("/:tradeId/split-trade", splitTrades);
router.put("/:tradeId/make-as-break-even", makeAsBreakEven);

module.exports = router;
