const httpErrors = require("http-errors");
const QRCode = require("qrcode");
const AdminModel = require("../../models/Admin.model");
const Token = require("../../models/Token.model");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/util/generate_token");
const {
  encrypt,
  decrypt,
  newSecret,
  otpauthUrl,
  verifyChallengeToken,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  assertNotLocked,
  registerFailure,
} = require("../../helpers/adminTwoFactor");
const { recordAudit } = require("../../helpers/auditLog");

// How long one unconfirmed setup secret stays valid (covers reloads).
const PENDING_SECRET_TTL_MS = 30 * 60 * 1000;

const loadAdmin = async (challengeToken) => {
  const uuid = verifyChallengeToken(challengeToken);
  const admin = await AdminModel.findOne({ uuid });
  if (!admin) throw httpErrors.Unauthorized("Please sign in again.");
  if (admin.isActive === false) {
    throw httpErrors.Forbidden("Your admin access has been revoked.");
  }
  return admin;
};

/** Session tokens for an admin who passed both steps. */
const issueSession = async (admin) => {
  const payload = {
    _id: admin._id,
    uuid: admin.uuid,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    role: "Admin",
    // jwt_validation only accepts admin tokens that carry this.
    mfa: true,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await Token.create({ user: admin.uuid, token: refreshToken });
  await AdminModel.updateOne({ uuid: admin.uuid }, { $set: { lastLoginAt: new Date() } });
  return { accessToken, refreshToken };
};

const auditAs = (admin, entry) =>
  recordAudit(
    { user: { uuid: admin.uuid, firstName: admin.firstName, lastName: admin.lastName } },
    { entityType: "admin", entityId: admin.uuid, entityName: admin.email, ...entry }
  );

/**
 * POST /api/auth/admin/2fa/setup  { challengeToken }
 * First sign-in: a new secret as a QR code (and as text for manual entry).
 * Nothing is enabled until a code from the app is confirmed.
 */
const setupTwoFactor = async (req, res, next) => {
  try {
    const admin = await loadAdmin(req.body?.challengeToken);
    if (admin.twoFactor?.enabled) {
      throw httpErrors.BadRequest("Two-factor authentication is already set up.");
    }
    // Same secret for repeated calls during one setup (a page reload, or
    // React running the effect twice in development). A fresh secret on
    // every call meant the QR code on screen could belong to a different
    // secret than the one saved, and every correct code was rejected.
    // Store a new secret only if none is pending (or it is too old). The
    // condition makes this atomic, so simultaneous calls all end up showing
    // the one secret that was actually saved.
    await AdminModel.updateOne(
      {
        uuid: admin.uuid,
        $or: [
          { "twoFactor.pendingSecretEnc": { $exists: false } },
          {
            "twoFactor.pendingCreatedAt": {
              $lt: new Date(Date.now() - PENDING_SECRET_TTL_MS),
            },
          },
          { "twoFactor.pendingCreatedAt": { $exists: false } },
        ],
      },
      {
        $set: {
          "twoFactor.pendingSecretEnc": encrypt(newSecret()),
          "twoFactor.pendingCreatedAt": new Date(),
        },
      }
    );
    const stored = await AdminModel.findOne({ uuid: admin.uuid })
      .select("twoFactor.pendingSecretEnc")
      .lean();
    const secret = decrypt(stored.twoFactor.pendingSecretEnc);
    const url = otpauthUrl(admin.email, secret);
    res.json({
      message: "Scan the QR code with your authenticator app.",
      qrCode: await QRCode.toDataURL(url, { margin: 1, width: 220 }),
      manualKey: secret.match(/.{1,4}/g).join(" "),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/admin/2fa/verify  { challengeToken, code } or { challengeToken, backupCode }
 * Second step. During setup it confirms the app and returns backup codes once.
 */
const verifyTwoFactor = async (req, res, next) => {
  try {
    const { challengeToken, code, backupCode } = req.body || {};
    const admin = await loadAdmin(challengeToken);
    assertNotLocked(admin);
    const tf = admin.twoFactor || {};

    // ---- first-time setup: confirm the app, turn 2FA on, hand out backup codes
    if (!tf.enabled) {
      if (!tf.pendingSecretEnc) {
        throw httpErrors.BadRequest("Start the setup again to get a new QR code.");
      }
      const step = verifyTotp(decrypt(tf.pendingSecretEnc), code);
      if (!step) {
        const left = await registerFailure(AdminModel, admin);
        throw httpErrors.BadRequest(
          left
            ? `That code didn't match. Check the time on your phone and try again (${left} attempts left).`
            : "Too many wrong codes. Try again in 15 minutes."
        );
      }
      const backup = generateBackupCodes();
      await AdminModel.updateOne(
        { uuid: admin.uuid },
        {
          $set: {
            "twoFactor.enabled": true,
            "twoFactor.enabledAt": new Date(),
            "twoFactor.secretEnc": tf.pendingSecretEnc,
            "twoFactor.backupCodes": backup.stored,
            "twoFactor.lastUsedStep": step,
            "twoFactor.failedAttempts": 0,
          },
          $unset: {
            "twoFactor.pendingSecretEnc": "",
            "twoFactor.pendingCreatedAt": "",
            "twoFactor.lockedUntil": "",
          },
        }
      );
      await auditAs(admin, { action: "admin.2fa_enabled" });
      return res.json({
        message: "Two-factor authentication is on.",
        ...(await issueSession(admin)),
        backupCodes: backup.plain,
      });
    }

    // ---- normal sign-in
    let usedBackupCode = false;
    if (backupCode) {
      const hash = hashBackupCode(backupCode);
      const match = (tf.backupCodes || []).find((item) => item.hash === hash && !item.usedAt);
      if (!match) {
        const left = await registerFailure(AdminModel, admin);
        throw httpErrors.BadRequest(
          left
            ? `That backup code isn't valid or was already used (${left} attempts left).`
            : "Too many wrong codes. Try again in 15 minutes."
        );
      }
      await AdminModel.updateOne(
        { uuid: admin.uuid, "twoFactor.backupCodes.hash": hash },
        {
          $set: {
            "twoFactor.backupCodes.$.usedAt": new Date(),
            "twoFactor.failedAttempts": 0,
          },
          $unset: { "twoFactor.lockedUntil": "" },
        }
      );
      usedBackupCode = true;
      await auditAs(admin, { action: "admin.2fa_backup_code_used" });
    } else {
      const step = verifyTotp(decrypt(tf.secretEnc), code, tf.lastUsedStep);
      if (!step) {
        const left = await registerFailure(AdminModel, admin);
        throw httpErrors.BadRequest(
          left
            ? `That code didn't match (${left} attempts left).`
            : "Too many wrong codes. Try again in 15 minutes."
        );
      }
      await AdminModel.updateOne(
        { uuid: admin.uuid },
        {
          $set: { "twoFactor.lastUsedStep": step, "twoFactor.failedAttempts": 0 },
          $unset: { "twoFactor.lockedUntil": "" },
        }
      );
    }

    const remaining =
      (tf.backupCodes || []).filter((item) => !item.usedAt).length - (usedBackupCode ? 1 : 0);
    res.json({
      message: "Signed in.",
      ...(await issueSession(admin)),
      ...(usedBackupCode && { backupCodesRemaining: remaining }),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { setupTwoFactor, verifyTwoFactor };
