const router = require("express").Router();

// api for the cumulative stats
const getDashboardMetrics = require("../../controllers/dashboard/getDashboardMetrics");
// const getDailyStats = require("../../controllers/dashboard/getDailyStats");
const getDailyStats = require("../../controllers/dashboard/getDailyStats");
const cumulativeStats = require("../../controllers/dashboard/cumulativeStats");
// api for the rest of the dashboard stats
const dashboardStats = require("../../controllers/dashboard/dashboardStats");
const dateStats = require("../../controllers/dashboard/dateStats");
const getTrades = require("../../controllers/dashboard/getTrades");
// const calendarStats = require("../../controllers/dashboard/executions/calendarStats");
const calendarStats = require("../../controllers/dashboard/calendarStats");
const journalStats = require("../../controllers/dashboard/journalStats");
const tagsStats = require("../../controllers/dashboard/tagsStats");
const plannedRealizedStats = require("../../controllers/dashboard/plannedRealizedStats");
const unreadSupportCount = require("../../controllers/dashboard/unreadSupportCount");
const weeklyStats = require("../../controllers/dashboard/weeklyStats");
const overallStats = require("../../controllers/dashboard/overallStats");

// get user details
router.get("/metrics", getDashboardMetrics);
// we are getting  Daily Net Cumulative P&L and daily win% result
router.get("/daily-stats", getDailyStats);
// heres we are getting only Net Cumulative P&L

router.get("/cumulative-stats", cumulativeStats);
// here we are getting profit to loss ration, ,trade  win% ,  avg win/loss,
router.get("/pnl-stats", dashboardStats);
// here we are getting all the trades
router.get("/trades-stats", getTrades);
// here we are getting the calendar stats
router.get("/calendar-stats", calendarStats);
// here we are getting the date on which journal has been attached
router.get("/journal-stats", journalStats);
// here we are getting  tags stats
router.get("/tags-stats", tagsStats);
// here we are getting  planned and realized  Multiplier
router.get("/planned-realize", plannedRealizedStats);

//get the support unread messages count
router.get("/unseen-count", unreadSupportCount);
//weekly stats on the dashboard , in calendar
router.get("/weekly-stats", weeklyStats);
// overall stats on the dashboard ,
router.get("/overall-stats", overallStats);
// mobile calendar stats on the dashboard ,
router.get("/date-stats/", dateStats);

module.exports = router;
