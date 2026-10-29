const router = require("express").Router();
const { requirePermission, requireAdmin } = require("../../middlewares/requirePermission");
const {
  getTwoFactorStatus,
  regenerateBackupCodes,
} = require("../../adminController/security/twoFactor");

// Every admin manages their own two-factor settings.
router.use(requireAdmin);
router.get("/2fa", getTwoFactorStatus);
router.post("/2fa/backup-codes", regenerateBackupCodes);

module.exports = router;
