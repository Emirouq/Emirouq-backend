const router = require("express").Router();

// bring in models and controllers
const createSupport = require("../../controllers/support/create-support");
const createActivity = require("../../controllers/support/create-activity");
const getSupport = require("../../controllers/support/get-support");
const getAllSupportForAdmin = require("../../controllers/support/get-all-support-admin");
const getActivity = require("../../controllers/support/get-activity");
const readSupportTicket = require("../../controllers/support/read-ticker");
const deleteSupport = require("../../controllers/support/delete-support");
const closeSupportTicket = require("../../controllers/support/close-open-support");
const respondToTicket = require("../../controllers/support/respondToTicket");
const createReport = require("../../controllers/support/create-report");
const getReportReasons = require("../../controllers/support/get-report-reasons");
const { requirePermission } = require("../../middlewares/requirePermission");

// Older admin endpoints (the admin panel now uses /admin/api/support).

// get user details
router.post("/", createSupport);
router.post("/report", createReport);
router.get("/report-reasons", getReportReasons);
router.get("/admin", requirePermission("support", "view"), getAllSupportForAdmin);
router.get("/", getSupport);
router.put("/:id", requirePermission("support", "edit"), respondToTicket);
router.post("/activity/:supportId", createActivity);
router.get("/activity/:supportId", getActivity);
router.put("/read/:supportId", readSupportTicket);
router.put("/close-open/:supportId", requirePermission("support", "edit"), closeSupportTicket);
router.delete("/:id", requirePermission("support", "edit"), deleteSupport);

module.exports = router;
