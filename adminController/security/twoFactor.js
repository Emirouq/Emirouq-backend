const httpErrors = require("http-errors");
const AdminModel = require("../../models/Admin.model");
const {
  decrypt,
  verifyTotp,
  generateBackupCodes,
  assertNotLocked,
  registerFailure,
} = require("../../helpers/adminTwoFactor");
const { recordAudit } = require("../../helpers/auditLog");

/** GET /admin/api/security/2fa: the signed-in admin's 2FA status. */
const getTwoFactorStatus = async (req, res, next) => {
  try {
    const admin = await AdminModel.findOne({ uuid: req.user.uuid }).lean();
    const tf = admin?.twoFactor || {};
    res.json({
      data: {
        enabled: !!tf.enabled,
        enabledAt: tf.enabledAt,
        backupCodesRemaining: (tf.backupCodes || []).filter((code) => !code.usedAt).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/api/security/2fa/backup-codes  { code }
 * New set of backup codes (old ones stop working). Needs a current app code.
 */
const regenerateBackupCodes = async (req, res, next) => {
  try {
    const admin = await AdminModel.findOne({ uuid: req.user.uuid });
    if (!admin?.twoFactor?.enabled) throw httpErrors.BadRequest("Two-factor is not set up.");
    assertNotLocked(admin);
    const step = verifyTotp(
      decrypt(admin.twoFactor.secretEnc),
      req.body?.code,
      admin.twoFactor.lastUsedStep
    );
    if (!step) {
      const left = await registerFailure(AdminModel, admin);
      throw httpErrors.BadRequest(
        left ? `That code didn't match (${left} attempts left).` : "Too many wrong codes. Try again in 15 minutes."
      );
    }
    const backup = generateBackupCodes();
    await AdminModel.updateOne(
      { uuid: admin.uuid },
      {
        $set: {
          "twoFactor.backupCodes": backup.stored,
          "twoFactor.lastUsedStep": step,
          "twoFactor.failedAttempts": 0,
        },
      }
    );
    await recordAudit(req, {
      action: "admin.2fa_backup_codes_regenerated",
      entityType: "admin",
      entityId: admin.uuid,
      entityName: admin.email,
    });
    res.json({ message: "New backup codes created.", backupCodes: backup.plain });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTwoFactorStatus, regenerateBackupCodes };
