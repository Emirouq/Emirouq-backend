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

// get user details
router.post("/", createSupport);
router.get("/admin", getAllSupportForAdmin);
router.get("/", getSupport);
router.put("/:id", respondToTicket);
router.post("/activity/:supportId", createActivity);
router.get("/activity/:supportId", getActivity);
router.put("/read/:supportId", readSupportTicket);
router.put("/close-open/:supportId", closeSupportTicket);
router.delete("/:id", deleteSupport);

module.exports = router;
