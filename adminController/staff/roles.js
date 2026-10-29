const Joi = require("joi");
const httpErrors = require("http-errors");
const slugify = require("slugify");
const AdminRole = require("../../models/AdminRole.model");
const Admin = require("../../models/Admin.model");
const { clearRoleCache } = require("../../services/adminRbac");
const { recordAudit } = require("../../helpers/auditLog");
const {
  MODULES,
  ACTION_LABELS,
  ALL_PERMISSIONS,
  SUPER_ADMIN,
} = require("../../helpers/adminPermissions");

const requireSuperAdmin = (req) => {
  if (!req.user.isSuperAdmin) {
    throw httpErrors.Forbidden("Only a Super Admin can change role definitions.");
  }
};

const schema = Joi.object({
  name: Joi.string().trim().max(60).required(),
  description: Joi.string().trim().max(200).allow(""),
  permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)).unique().required(),
});

/** GET /admin/api/roles: roles, how many staff hold each, and the permission catalog. */
const listRoles = async (req, res, next) => {
  try {
    const [roles, counts] = await Promise.all([
      AdminRole.find({}).sort({ isSystem: -1, name: 1 }).lean(),
      Admin.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $unwind: "$roles" },
        { $group: { _id: "$roles", count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json({
      data: roles.map((role) => ({
        ...role,
        staffCount: countMap[role.key] || 0,
        locked: role.key === SUPER_ADMIN,
      })),
      catalog: { modules: MODULES, actions: ACTION_LABELS },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /admin/api/roles: a custom role. */
const createRole = async (req, res, next) => {
  try {
    requireSuperAdmin(req);
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);
    const key = slugify(value.name, { lower: true, strict: true, replacement: "_" });
    if (!key || (await AdminRole.exists({ $or: [{ key }, { name: value.name }] }))) {
      throw httpErrors.Conflict("A role with this name already exists.");
    }
    const role = await AdminRole.create({ ...value, key, isSystem: false });
    clearRoleCache();
    await recordAudit(req, {
      action: "role.created",
      entityType: "role",
      entityId: key,
      entityName: value.name,
      after: { permissions: value.permissions },
    });
    res.status(201).json({ message: "Role created.", data: role });
  } catch (error) {
    next(error);
  }
};

/** PUT /admin/api/roles/:key: change a role's permissions (not Super Admin). */
const updateRole = async (req, res, next) => {
  try {
    requireSuperAdmin(req);
    if (req.params.key === SUPER_ADMIN) {
      throw httpErrors.BadRequest("Super Admin always has every permission.");
    }
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);
    const role = await AdminRole.findOne({ key: req.params.key });
    if (!role) throw httpErrors.NotFound("Role not found");
    const before = { permissions: role.permissions };
    role.name = value.name;
    role.description = value.description;
    role.permissions = value.permissions;
    await role.save();
    clearRoleCache(); // applies to everyone holding it right away
    await recordAudit(req, {
      action: "role.updated",
      entityType: "role",
      entityId: role.key,
      entityName: role.name,
      before,
      after: { permissions: role.permissions },
    });
    res.json({ message: "Role updated.", data: role });
  } catch (error) {
    next(error);
  }
};

/** DELETE /admin/api/roles/:key: custom roles nobody holds. */
const deleteRole = async (req, res, next) => {
  try {
    requireSuperAdmin(req);
    const role = await AdminRole.findOne({ key: req.params.key });
    if (!role) throw httpErrors.NotFound("Role not found");
    if (role.isSystem) throw httpErrors.BadRequest("Built-in roles can't be deleted.");
    const holders = await Admin.countDocuments({ roles: role.key });
    if (holders) {
      throw httpErrors.BadRequest(
        `${holders} staff member(s) still have this role. Remove it from them first.`
      );
    }
    await AdminRole.deleteOne({ key: role.key });
    clearRoleCache();
    await recordAudit(req, {
      action: "role.deleted",
      entityType: "role",
      entityId: role.key,
      entityName: role.name,
    });
    res.json({ message: "Role deleted." });
  } catch (error) {
    next(error);
  }
};

module.exports = { listRoles, createRole, updateRole, deleteRole };
