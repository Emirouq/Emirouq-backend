const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

// bring in models and controllers
const getDashboardSummary = require("../../adminController/dashboard/getDashboardSummary");
const getDashboardOverview = require("../../adminController/dashboard/getDashboardOverview");

// dashboard data is admin-only
router.use(requirePermission("dashboard", "view"));

// get user details
router.get("/summary", getDashboardSummary);

// KPIs, trends and moderation queue for the admin panel dashboard
router.get("/overview", getDashboardOverview);

// webhooks route

module.exports = router;
