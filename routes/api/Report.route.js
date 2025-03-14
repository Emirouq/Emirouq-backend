const router = require("express").Router();

// bring in models and controllers
const getReportStats = require("../../controllers/report/getReportStats-v1");
const getTagsReport = require("../../controllers/report/getTagsReport");
const getReportSummary = require("../../controllers/report/getReportSummary");
const dailyWinReport = require("../../controllers/report/dailyWinReport");
const tradeWinReport = require("../../controllers/report/tradeWinReport");
const dayReports = require("../../controllers/report/dayWeek/dayReports");
const weekReports = require("../../controllers/report/dayWeek/weekReports");
const monthReports = require("../../controllers/report/dayWeek/monthReports");
const priceReport = require("../../controllers/report/price/priceReport");
const volumeReport = require("../../controllers/report/price/volumeReport");
const instrumentReport = require("../../controllers/report/price/instrumentReport");
const rMultiple = require("../../controllers/report/risk/rMultiple");
const positionSize = require("../../controllers/report/risk/positionSize");
const dteReport = require("../../controllers/report/option/dteReport");
const distributionPerformanceTagReport = require("../../controllers/report/tags/distributionPerformanceTagReport");
const winLossReport = require("../../controllers/report/winLossReport/winLoss");
const overallReport = require("../../controllers/report/overallReport");

router.get("/overall", overallReport);
router.get("/stats", getReportStats);
router.get("/tags", getTagsReport);
router.get("/summary", getReportSummary);
router.get("/daily-win-streak", dailyWinReport);
router.get("/trade-win-streak", tradeWinReport);
// date wise reports
router.get("/days", dayReports);
router.get("/weeks", weekReports);
router.get("/months", monthReports);

//price and volume reports
router.get("/price", priceReport);
router.get("/volume", volumeReport);
router.get("/instrument", instrumentReport);

//risk
router.get("/r-multiple", rMultiple);
router.get("/position-size", positionSize);

//days-till-expiration
router.get("/dte", dteReport);

// distribution and performance tag reports
router.get("/tags-report/:categoryId", distributionPerformanceTagReport);

//win loss trades
router.get("/win-loss-trades", winLossReport);

module.exports = router;
