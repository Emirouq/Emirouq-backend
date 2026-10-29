const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const httpErrors = require("http-errors");
const { authenticator } = require("otplib");
const { accessSecret } = require("../config/keys").jwt;

/**
 * Admin two-factor sign-in with an authenticator app (TOTP, RFC 6238).
 *
 * Flow: password OK -> short-lived "challenge" token (not a session) ->
 * 6-digit code (or a backup code) -> real session tokens carrying mfa: true.
 * jwt_validation rejects admin tokens without that flag.
 */

const ISSUER = "Emirouq Admin";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BACKUP_CODE_COUNT = 10;
const STEP_SECONDS = 30;

// Accept the previous / next 30-second code too, for clock drift.
authenticator.options = { window: 1, step: STEP_SECONDS };

// Separate keys derived from the JWT secret unless set explicitly, so a
// challenge token can never pass as a session token.
const derive = (label) =>
  crypto.createHash("sha256").update(`${accessSecret}:${label}`).digest();
const encryptionKey = process.env.ADMIN_2FA_ENCRYPTION_KEY
  ? crypto.createHash("sha256").update(process.env.ADMIN_2FA_ENCRYPTION_KEY).digest()
  : derive("admin-2fa-encryption");
const challengeSecret = derive("admin-2fa-challenge").toString("hex");

// ------------------------------------------------------------ secrets

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};

const decrypt = (payload) => {
  const [iv, tag, data] = String(payload).split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};

const newSecret = () => authenticator.generateSecret(20);
const otpauthUrl = (email, secret) => authenticator.keyuri(email, ISSUER, secret);

// ----------------------------------------------------- challenge token

const createChallengeToken = (admin) =>
  jwt.sign({ uuid: admin.uuid, purpose: "admin_2fa" }, challengeSecret, {
    expiresIn: "10m",
  });

const verifyChallengeToken = (token) => {
  try {
    const payload = jwt.verify(token, challengeSecret);
    if (payload?.purpose !== "admin_2fa" || !payload.uuid) throw new Error();
    return payload.uuid;
  } catch {
    throw httpErrors.Unauthorized("Your sign-in expired. Please enter your password again.");
  }
};

// ---------------------------------------------------------------- codes

/**
 * Checks a 6-digit code. Returns the accepted time step, or null.
 * A step at or before `lastUsedStep` is refused, so a code works once.
 */
const verifyTotp = (secret, code, lastUsedStep) => {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const delta = authenticator.checkDelta(clean, secret);
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
  if (lastUsedStep && step <= lastUsedStep) return null;
  return step;
};

const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const normalizeBackupCode = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashBackupCode = (code) =>
  crypto.createHash("sha256").update(normalizeBackupCode(code)).digest("hex");

/** Returns { plain: ["ABCD-EFGH", …], stored: [{ hash }] }. */
const generateBackupCodes = () => {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from(
      { length: 8 },
      () => BACKUP_ALPHABET[crypto.randomInt(BACKUP_ALPHABET.length)]
    ).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
  return { plain, stored: plain.map((code) => ({ hash: hashBackupCode(code) })) };
};

// -------------------------------------------------------------- lockout

const assertNotLocked = (admin) => {
  const until = admin?.twoFactor?.lockedUntil;
  if (until && new Date(until) > new Date()) {
    const minutes = Math.ceil((new Date(until) - Date.now()) / 60000);
    throw httpErrors.TooManyRequests(
      `Too many wrong codes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
  }
};

/** Records a wrong code; locks after MAX_FAILED_ATTEMPTS. Returns attempts left. */
const registerFailure = async (Admin, admin) => {
  const attempts = (admin.twoFactor?.failedAttempts || 0) + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  await Admin.updateOne(
    { uuid: admin.uuid },
    {
      $set: {
        "twoFactor.failedAttempts": locked ? 0 : attempts,
        ...(locked && {
          "twoFactor.lockedUntil": new Date(Date.now() + LOCK_MINUTES * 60000),
        }),
      },
    }
  );
  return locked ? 0 : MAX_FAILED_ATTEMPTS - attempts;
};

module.exports = {
  ISSUER,
  encrypt,
  decrypt,
  newSecret,
  otpauthUrl,
  createChallengeToken,
  verifyChallengeToken,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  assertNotLocked,
  registerFailure,
};
