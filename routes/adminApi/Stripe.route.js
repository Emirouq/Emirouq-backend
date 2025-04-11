const router = require("express").Router();

// bring in models and controllers
const createPlan = require("../../adminController/stripe/createPlan");
const getSubscriptionPlanList = require("../../adminController/stripe/getSubscriptionPlanList");
const updatePlan = require("../../adminController/stripe/updatePlan");

// create plan route
router.post("/", createPlan);
// get subscription plan list route
router.get("/", getSubscriptionPlanList);
// update plan route
router.put("/:id", updatePlan);

// webhooks route

module.exports = router;
