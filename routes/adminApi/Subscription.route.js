const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getOverview = require("../../adminController/subscriptions/getOverview");
const listSubscriptions = require("../../adminController/subscriptions/listSubscriptions");
const getSubscription = require("../../adminController/subscriptions/getSubscription");
const listTransactions = require("../../adminController/subscriptions/listTransactions");
const listPackages = require("../../adminController/subscriptions/listPackages");

router.get("/overview", requirePermission("subscriptions", "view"), getOverview);
router.get("/transactions", requirePermission("finance", "view"), listTransactions);
router.post(
  "/transactions/:id/refund",
  requirePermission("finance", "approve"),
  require("../../adminController/subscriptions/refundTransaction")
);
router.get("/packages", requirePermission("subscriptions", "view"), listPackages);
router.get("/", requirePermission("subscriptions", "view"), listSubscriptions);
router.get("/:id", requirePermission("subscriptions", "view"), getSubscription);

module.exports = router;
