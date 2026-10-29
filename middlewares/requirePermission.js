const createError = require("http-errors");
const { recordAudit } = require("../helpers/auditLog");

const SECRET_FIELDS = /pass|token|secret|code|otp|card/i;

/** Body summary for the audit trail, without secrets or huge values. */
const summarizeBody = (body) => {
  if (!body || typeof body !== "object") return undefined;
  const out = {};
  for (const [key, value] of Object.entries(body).slice(0, 20)) {
    if (SECRET_FIELDS.test(key)) continue;
    if (typeof value === "string") out[key] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean" || value === null)
      out[key] = value;
    else if (Array.isArray(value)) out[key] = `[${value.length} items]`;
    else out[key] = "{…}";
  }
  return out;
};

/**
 * Allows the request only if the signed-in admin has `<module>.<action>`.
 * Successful changes (anything but GET) are written to the audit trail.
 *
 *   router.post("/", requirePermission("categories", "create"), handler)
 */
const requirePermission = (module, action, { audit = true } = {}) => (req, res, next) => {
  const permission = `${module}.${action}`;
  if (req.user?.role !== "Admin" || !req.user?.permissions?.includes(permission)) {
    return next(
      createError.Forbidden("You don't have permission to do this. Ask a Super Admin for access.")
    );
  }
  // Controllers that write their own, richer audit entry pass { audit: false }.
  if (audit && req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      recordAudit(req, {
        action: permission,
        entityType: module,
        entityId: req.params?.id || req.params?.subCategoryId || req.params?.categoryId || "-",
        note: `${req.method} ${req.baseUrl}${req.path}`,
        details: summarizeBody(req.body),
      });
    });
  }
  return next();
};

/** Any signed-in admin (e.g. their own security settings). */
const requireAdmin = (req, res, next) =>
  req.user?.role === "Admin"
    ? next()
    : next(createError.Forbidden("Admins only."));

module.exports = { requirePermission, requireAdmin };
