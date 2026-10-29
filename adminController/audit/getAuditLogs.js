const AdminAuditLog = require("../../models/AdminAuditLog.model");

/** GET /admin/api/audit-logs?entityType=&entityId=&start=&limit= */
const getAuditLogs = async (req, res, next) => {
  try {
    const { entityType, entityId, start, limit } = req.query;
    const filter = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    };
    const [data, count] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(start || 0))
        .limit(Math.min(parseInt(limit || 20), 100))
        .lean(),
      AdminAuditLog.countDocuments(filter),
    ]);
    res.json({ message: "Audit logs", data, count });
  } catch (error) {
    next(error);
  }
};

module.exports = getAuditLogs;
