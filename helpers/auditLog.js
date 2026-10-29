const { v4: uuid } = require("uuid");
const AdminAuditLog = require("../models/AdminAuditLog.model");

/**
 * Writes one admin audit entry. Never throws: a failed log write must not
 * undo or fail the admin's change.
 */
const recordAudit = async (req, entry) => {
  try {
    await AdminAuditLog.create({
      uuid: uuid(),
      adminId: req.user?.uuid,
      adminName:
        `${req.user?.firstName || ""} ${req.user?.lastName || ""}`.trim() ||
        "Admin",
      ...entry,
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
};

module.exports = { recordAudit };
