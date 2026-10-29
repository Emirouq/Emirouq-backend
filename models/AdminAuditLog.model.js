const { Schema, model } = require("mongoose");

/** Who changed what in the admin panel, and when. Append-only. */
const AdminAuditLogSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true },
    adminId: { type: String },
    adminName: { type: String },
    // e.g. "category.disabled", "subCategory.enabled", "category.free_changed"
    action: { type: String, required: true },
    entityType: { type: String, required: true }, // category | subCategory
    entityId: { type: String, required: true },
    entityName: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    note: { type: String },
    // Side effects, e.g. { adsHidden: 12 }
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ createdAt: -1 });

module.exports = model("AdminAuditLog", AdminAuditLogSchema, "adminAuditLogs");
