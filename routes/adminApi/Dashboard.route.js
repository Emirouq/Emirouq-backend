const router = require("express").Router();

// bring in models and controllers
const getDashboardSummary = require("../../adminController/dashboard/getDashboardSummary");

// get user details
router.get("/summary", getDashboardSummary);

// webhooks route

module.exports = router;
