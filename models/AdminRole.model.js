const { Schema, model } = require("mongoose");

/** An admin role: a named set of permissions ("<module>.<action>"). */
const AdminRoleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "support_admin"
    name: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    // Built-in roles cannot be deleted; Super Admin cannot be edited either.
    isSystem: { type: Boolean, default: false },
    // ROLE_MIGRATIONS already applied to this role.
    appliedMigrations: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = model("AdminRole", AdminRoleSchema, "adminRoles");
