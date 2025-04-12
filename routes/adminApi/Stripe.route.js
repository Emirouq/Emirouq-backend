const router = require("express").Router();

// bring in models and controllers
const createPlan = require("../../adminController/stripe/createPlan");
const getSubscriptionPlanList = require("../../adminController/stripe/getSubscriptionPlanList");
const updatePlan = require("../../adminController/stripe/updatePlan");

// create plan route
router.post("/create-plan", createPlan);
// get subscription plan list route
router.get("/plan-list", getSubscriptionPlanList);
// update plan route
router.put("/plan/:id", updatePlan);
// update plan route

// webhooks route

module.exports = router;
