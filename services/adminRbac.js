const AdminRole = require("../models/AdminRole.model");
const Admin = require("../models/Admin.model");
const {
  SYSTEM_ROLES,
  SUPER_ADMIN,
  ALL_PERMISSIONS,
  ROLE_MIGRATIONS,
} = require("../helpers/adminPermissions");

/**
 * Creates the built-in roles and gives admins from before RBAC the Super
 * Admin role, so nobody is locked out on first deploy. Safe on every start.
 */
const ensureAdminRbac = async () => {
  for (const role of SYSTEM_ROLES) {
    await AdminRole.updateOne(
      { key: role.key },
      {
        $setOnInsert: {
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      },
      { upsert: true }
    );
  }
  // Super Admin always has every permission, including modules added later.
  await AdminRole.updateOne(
    { key: SUPER_ADMIN },
    { $set: { permissions: ALL_PERMISSIONS, isSystem: true } }
  );
  for (const migration of ROLE_MIGRATIONS) {
    await AdminRole.updateOne(
      { key: migration.role, appliedMigrations: { $ne: migration.id } },
      {
        $addToSet: {
          permissions: { $each: migration.add },
          appliedMigrations: migration.id,
        },
      }
    );
  }
  const { modifiedCount } = await Admin.updateMany(
    { roles: { $exists: false } },
    { $set: { roles: [SUPER_ADMIN] } }
  );
  if (modifiedCount) {
    console.log(`RBAC: ${modifiedCount} existing admin(s) given the Super Admin role`);
  }
};

// Roles change rarely; a short cache avoids a lookup on every request.
let cache = { at: 0, roles: new Map() };
const CACHE_MS = 30 * 1000;

const loadRoles = async () => {
  if (Date.now() - cache.at < CACHE_MS) return cache.roles;
  const roles = await AdminRole.find({}).lean();
  cache = { at: Date.now(), roles: new Map(roles.map((role) => [role.key, role])) };
  return cache.roles;
};

/** Call after any role change so it applies immediately. */
const clearRoleCache = () => {
  cache = { at: 0, roles: new Map() };
};

/** Permission list for an admin document. */
const permissionsFor = async (admin) => {
  const keys = admin?.roles || [];
  if (keys.includes(SUPER_ADMIN)) return { permissions: ALL_PERMISSIONS, isSuperAdmin: true };
  const roles = await loadRoles();
  const permissions = new Set();
  for (const key of keys) {
    (roles.get(key)?.permissions || []).forEach((permission) => permissions.add(permission));
  }
  return { permissions: [...permissions], isSuperAdmin: false };
};

module.exports = { ensureAdminRbac, permissionsFor, clearRoleCache, loadRoles };
