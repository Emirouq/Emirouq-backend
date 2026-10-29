const router = require("express").Router();
const { requirePermission } = require("../../middlewares/requirePermission");
const staff = require("../../adminController/staff/staff");
const roles = require("../../adminController/staff/roles");

// The controllers write detailed audit entries themselves.
const can = (action) => requirePermission("staff", action, { audit: false });

router.get("/roles", can("view"), roles.listRoles);
router.post("/roles", can("create"), roles.createRole);
router.put("/roles/:key", can("edit"), roles.updateRole);
router.delete("/roles/:key", can("delete"), roles.deleteRole);

router.get("/", can("view"), staff.listStaff);
router.post("/", can("create"), staff.inviteStaff);
router.patch("/:id", can("edit"), staff.updateStaff);
router.put("/:id/status", can("edit"), staff.setStaffStatus);
router.post("/:id/invite", can("create"), staff.resendInvite);
router.post("/:id/reset-2fa", can("edit"), staff.resetStaffTwoFactor);
router.delete("/:id", can("delete"), staff.deleteStaff);

module.exports = router;
