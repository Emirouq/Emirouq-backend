const crypto = require("crypto");
const httpErrors = require("http-errors");
const Admin = require("../../models/Admin.model");
const { loadRoles } = require("../../services/adminRbac");
const { SUPER_ADMIN } = require("../../helpers/adminPermissions");

const INVITE_HOURS = 72;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** New one-time invite token; only its hash is stored. */
const newInvite = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    fields: {
      inviteTokenHash: hashToken(token),
      inviteExpiresAt: new Date(Date.now() + INVITE_HOURS * 3600 * 1000),
    },
  };
};

/** Where invite links point: ADMIN_PANEL_URL, else the panel that sent the request. */
const inviteUrl = (req, token) => {
  const base = (
    process.env.ADMIN_PANEL_URL ||
    req.get("origin") ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
  return `${base}/accept-invite?token=${token}`;
};

/**
 * Stops privilege escalation: a non-Super-Admin may only hand out roles
 * whose permissions they hold themselves, and never Super Admin.
 */
const assertCanAssign = async (actor, roleKeys) => {
  const roles = await loadRoles();
  const unknown = roleKeys.filter((key) => !roles.has(key));
  if (unknown.length) throw httpErrors.BadRequest(`Unknown role: ${unknown.join(", ")}`);
  if (actor.isSuperAdmin) return;
  if (roleKeys.includes(SUPER_ADMIN)) {
    throw httpErrors.Forbidden("Only a Super Admin can grant the Super Admin role.");
  }
  const mine = new Set(actor.permissions || []);
  for (const key of roleKeys) {
    const missing = (roles.get(key).permissions || []).filter((p) => !mine.has(p));
    if (missing.length) {
      throw httpErrors.Forbidden(
        `You can't grant "${roles.get(key).name}": it includes permissions you don't have.`
      );
    }
  }
};

/** At least one active Super Admin must always remain. */
const assertNotLastSuperAdmin = async (admin) => {
  if (!admin.roles?.includes(SUPER_ADMIN) || admin.isActive === false) return;
  // Only accounts that can actually sign in count (a uuid, a confirmed
  // password, not deactivated); a half-made legacy record does not.
  const others = await Admin.countDocuments({
    uuid: { $nin: [admin.uuid, null] },
    roles: SUPER_ADMIN,
    isActive: { $ne: false },
    inviteTokenHash: { $exists: false },
  });
  if (!others) {
    throw httpErrors.BadRequest("There must be at least one active Super Admin.");
  }
};

/** Only a Super Admin may change a Super Admin's account. */
const assertCanManage = (actor, target) => {
  if (target.roles?.includes(SUPER_ADMIN) && !actor.isSuperAdmin) {
    throw httpErrors.Forbidden("Only a Super Admin can change a Super Admin's account.");
  }
};

const staffView = (admin, rolesMap) => ({
  uuid: admin.uuid,
  firstName: admin.firstName,
  lastName: admin.lastName,
  email: admin.email,
  roles: (admin.roles || []).map((key) => ({
    key,
    name: rolesMap.get(key)?.name || key,
  })),
  isActive: admin.isActive !== false,
  status:
    admin.isActive === false
      ? "deactivated"
      : admin.inviteTokenHash
        ? new Date(admin.inviteExpiresAt) < new Date()
          ? "invite_expired"
          : "invited"
        : "active",
  twoFactorEnabled: !!admin.twoFactor?.enabled,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
});

module.exports = {
  hashToken,
  newInvite,
  inviteUrl,
  assertCanAssign,
  assertNotLastSuperAdmin,
  assertCanManage,
  staffView,
};
