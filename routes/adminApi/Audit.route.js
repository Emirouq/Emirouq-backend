const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");

const getAuditLogs = require("../../adminController/audit/getAuditLogs");

router.get("/", requirePermission("auditLog", "view"), getAuditLogs);

module.exports = router;
