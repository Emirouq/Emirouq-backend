const httpErrors = require("http-errors");
const Admin = require("../../models/Admin.model");
const UserLoginMech = require("../../models/UserLoginMech.model");
const { hashPassword } = require("../../helpers/bcrypt");
const { hashToken } = require("../../adminController/staff/shared");
const { recordAudit } = require("../../helpers/auditLog");

const findInvite = async (token) => {
  if (!token || typeof token !== "string") throw httpErrors.BadRequest("Invalid link.");
  const admin = await Admin.findOne({ inviteTokenHash: hashToken(token) });
  if (!admin || admin.isActive === false) {
    throw httpErrors.BadRequest("This invitation link is not valid. Ask for a new one.");
  }
  if (new Date(admin.inviteExpiresAt) < new Date()) {
    throw httpErrors.BadRequest("This invitation has expired. Ask for a new one.");
  }
  return admin;
};

/** GET /api/auth/admin/invite/:token: who the invite is for. */
const getInvite = async (req, res, next) => {
  try {
    const admin = await findInvite(req.params.token);
    res.json({ data: { firstName: admin.firstName, email: admin.email } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/auth/admin/accept-invite  { token, password } */
const acceptInvite = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    const admin = await findInvite(token);
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw httpErrors.BadRequest("Use at least 8 characters, with letters and numbers.");
    }
    await UserLoginMech.findOneAndUpdate(
      { user: admin.uuid },
      { $set: { password: await hashPassword(password) } },
      { upsert: true }
    );
    admin.inviteTokenHash = undefined;
    admin.inviteExpiresAt = undefined;
    await admin.save({ validateBeforeSave: false });
    await recordAudit(
      { user: { uuid: admin.uuid, firstName: admin.firstName, lastName: admin.lastName } },
      { action: "staff.invite_accepted", entityType: "staff", entityId: admin.uuid, entityName: admin.email }
    );
    res.json({ message: "Password set. Sign in to finish setting up two-factor authentication." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInvite, acceptInvite };
