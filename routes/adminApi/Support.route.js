const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const listTickets = require("../../adminController/support/listTickets");
const getTicket = require("../../adminController/support/getTicket");
const updateTicket = require("../../adminController/support/updateTicket");
const ticketAdAction = require("../../adminController/support/ticketAdAction");
const getReportedAds = require("../../adminController/support/getReportedAds");
const listAdmins = require("../../adminController/support/listAdmins");

router.get("/", requirePermission("support", "view"), listTickets);
router.get("/reported-ads", requirePermission("support", "view"), getReportedAds);
router.get("/admins", requirePermission("support", "view"), listAdmins);
router.get("/:id", requirePermission("support", "view"), getTicket);
router.patch("/:id", requirePermission("support", "edit"), updateTicket);
// Taking a reported ad down (or restoring it) is a moderation decision.
router.post("/:id/ad-action", requirePermission("support", "approve"), ticketAdAction);

module.exports = router;
