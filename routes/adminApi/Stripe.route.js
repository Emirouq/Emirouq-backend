const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

// bring in models and controllers
const createPlan = require("../../adminController/stripe/createPlan");
const getSubscriptionPlanList = require("../../adminController/stripe/getSubscriptionPlanList");
const updatePlan = require("../../adminController/stripe/updatePlan");

// create plan route
router.post("/create-plan", requirePermission("subscriptions", "create"), createPlan);
// get subscription plan list route
router.get("/plan-list", requirePermission("subscriptions", "view"), getSubscriptionPlanList);
// update plan route
router.put("/plan/:id", requirePermission("subscriptions", "edit"), updatePlan);
// update plan route

// webhooks route

module.exports = router;
