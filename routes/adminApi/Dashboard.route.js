const router = require("express").Router();

// bring in models and controllers
const getDashboardSummary = require("../../adminController/dashboard/getDashboardSummary");
const getDashboardOverview = require("../../adminController/dashboard/getDashboardOverview");
const roleCheck = require("../../middlewares/roleCheck");

// dashboard data is admin-only
router.use((req, res, next) => roleCheck(req, res, next, ["admin", "Admin"]));

// get user details
router.get("/summary", getDashboardSummary);

// KPIs, trends and moderation queue for the admin panel dashboard
router.get("/overview", getDashboardOverview);

// webhooks route

module.exports = router;
