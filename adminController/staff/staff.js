const Joi = require("joi");
const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const Admin = require("../../models/Admin.model");
const Token = require("../../models/Token.model");
const UserLoginMech = require("../../models/UserLoginMech.model");
const { sendEmail } = require("../../services/util/sendEmail");
const { loadRoles } = require("../../services/adminRbac");
const { recordAudit } = require("../../helpers/auditLog");
const {
  newInvite,
  inviteUrl,
  assertCanAssign,
  assertNotLastSuperAdmin,
  assertCanManage,
  staffView,
} = require("./shared");

const audit = (req, target, action, extra = {}) =>
  recordAudit(req, {
    action,
    entityType: "staff",
    entityId: target.uuid,
    entityName: target.email,
    ...extra,
  });

const inviteEmail = ({ firstName, inviter, url }) => `
  <p>Hi ${firstName},</p>
  <p>${inviter} has invited you to the Emirouq admin panel.</p>
  <p><a href="${url}">Set your password and sign in</a></p>
  <p>This link works once and expires in 72 hours. You'll also set up
  two-factor authentication with an authenticator app.</p>`;

/** Sends the invite; the link is also returned so it can be shared by hand. */
const sendInvite = async (req, admin, token) => {
  const url = inviteUrl(req, token);
  let emailSent = true;
  await sendEmail(
    [admin.email],
    "You're invited to the Emirouq admin panel",
    inviteEmail({
      firstName: admin.firstName,
      inviter: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "An admin",
      url,
    })
  ).catch((error) => {
    emailSent = false;
    console.error("Staff invite email failed:", error?.message || error);
  });
  return { inviteUrl: url, emailSent };
};

const getTarget = async (req) => {
  const admin = await Admin.findOne({ uuid: req.params.id });
  if (!admin) throw httpErrors.NotFound("Staff member not found");
  return admin;
};

/** GET /admin/api/staff */
const listStaff = async (req, res, next) => {
  try {
    const [admins, roles] = await Promise.all([
      Admin.find({ uuid: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).lean(),
      loadRoles(),
    ]);
    res.json({ data: admins.map((admin) => staffView(admin, roles)) });
  } catch (error) {
    next(error);
  }
};

const inviteSchema = Joi.object({
  firstName: Joi.string().trim().max(50).required(),
  lastName: Joi.string().trim().max(50).required(),
  email: Joi.string().trim().lowercase().email().required(),
  roles: Joi.array().items(Joi.string()).min(1).unique().required(),
});

/** POST /admin/api/staff: add a staff member and email them an invite. */
const inviteStaff = async (req, res, next) => {
  try {
    const { value, error } = inviteSchema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);
    await assertCanAssign(req.user, value.roles);
    if (await Admin.exists({ email: value.email })) {
      throw httpErrors.Conflict("An admin with this email already exists.");
    }
    const invite = newInvite();
    const admin = await Admin.create({
      uuid: uuid(),
      ...value,
      role: "Admin",
      isActive: true,
      invitedBy: req.user.uuid,
      ...invite.fields,
    });
    const delivery = await sendInvite(req, admin, invite.token);
    await audit(req, admin, "staff.invited", { after: { roles: value.roles } });
    const roles = await loadRoles();
    res.status(201).json({
      message: delivery.emailSent
        ? `Invitation sent to ${admin.email}.`
        : "Staff member added, but the email could not be sent. Share the invite link yourself.",
      data: { staff: staffView(admin.toObject(), roles), ...delivery },
    });
  } catch (error) {
    next(error);
  }
};

const updateSchema = Joi.object({
  firstName: Joi.string().trim().max(50),
  lastName: Joi.string().trim().max(50),
  roles: Joi.array().items(Joi.string()).min(1).unique(),
}).min(1);

/** PATCH /admin/api/staff/:id: names and roles (assign / revoke). */
const updateStaff = async (req, res, next) => {
  try {
    const { value, error } = updateSchema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);
    const admin = await getTarget(req);
    assertCanManage(req.user, admin);

    const before = { roles: admin.roles };
    if (value.roles) {
      // Adding or removing must both be within what the actor may grant.
      const changed = [
        ...value.roles.filter((r) => !admin.roles.includes(r)),
        ...admin.roles.filter((r) => !value.roles.includes(r)),
      ];
      await assertCanAssign(req.user, changed);
      if (admin.roles.includes("super_admin") && !value.roles.includes("super_admin")) {
        await assertNotLastSuperAdmin(admin);
      }
      admin.roles = value.roles;
    }
    if (value.firstName) admin.firstName = value.firstName;
    if (value.lastName) admin.lastName = value.lastName;
    await admin.save({ validateBeforeSave: false });
    await audit(req, admin, "staff.updated", { before, after: { roles: admin.roles } });
    res.json({
      message: "Staff member updated.",
      data: staffView(admin.toObject(), await loadRoles()),
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /admin/api/staff/:id/status  { isActive }: revoke or restore access. */
const setStaffStatus = async (req, res, next) => {
  try {
    const isActive = req.body?.isActive === true;
    const admin = await getTarget(req);
    assertCanManage(req.user, admin);
    if (admin.uuid === req.user.uuid) {
      throw httpErrors.BadRequest("You can't deactivate your own account.");
    }
    if (!isActive) await assertNotLastSuperAdmin(admin);
    admin.isActive = isActive;
    await admin.save({ validateBeforeSave: false });
    // Revoking also ends their sessions (jwt_validation checks isActive too).
    if (!isActive) await Token.deleteMany({ user: admin.uuid });
    await audit(req, admin, isActive ? "staff.reactivated" : "staff.deactivated", {
      note: req.body?.note,
    });
    res.json({
      message: isActive ? "Access restored." : "Access revoked.",
      data: staffView(admin.toObject(), await loadRoles()),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /admin/api/staff/:id/invite: new invite link (old one stops working). */
const resendInvite = async (req, res, next) => {
  try {
    const admin = await getTarget(req);
    assertCanManage(req.user, admin);
    if (await UserLoginMech.exists({ user: admin.uuid })) {
      throw httpErrors.BadRequest("This staff member has already set up their account.");
    }
    const invite = newInvite();
    Object.assign(admin, invite.fields);
    await admin.save({ validateBeforeSave: false });
    const delivery = await sendInvite(req, admin, invite.token);
    await audit(req, admin, "staff.invite_resent");
    res.json({
      message: delivery.emailSent ? "Invitation sent again." : "Email failed. Share the link yourself.",
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /admin/api/staff/:id/reset-2fa: Super Admin only, for a lost phone. */
const resetStaffTwoFactor = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      throw httpErrors.Forbidden("Only a Super Admin can reset two-factor authentication.");
    }
    const admin = await getTarget(req);
    if (admin.uuid === req.user.uuid) {
      throw httpErrors.BadRequest("Use another Super Admin to reset your own two-factor.");
    }
    admin.twoFactor = undefined;
    await admin.save({ validateBeforeSave: false });
    await Token.deleteMany({ user: admin.uuid });
    await audit(req, admin, "staff.2fa_reset");
    res.json({ message: "Two-factor reset. They set it up again at their next sign-in." });
  } catch (error) {
    next(error);
  }
};

/** DELETE /admin/api/staff/:id: only invites never accepted; otherwise deactivate. */
const deleteStaff = async (req, res, next) => {
  try {
    const admin = await getTarget(req);
    assertCanManage(req.user, admin);
    if (await UserLoginMech.exists({ user: admin.uuid })) {
      throw httpErrors.BadRequest(
        "This person has signed in before. Deactivate them instead, so their history stays."
      );
    }
    await Admin.deleteOne({ uuid: admin.uuid });
    await audit(req, admin, "staff.invite_cancelled");
    res.json({ message: "Invitation cancelled." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStaff,
  inviteStaff,
  updateStaff,
  setStaffStatus,
  resendInvite,
  resetStaffTwoFactor,
  deleteStaff,
};
