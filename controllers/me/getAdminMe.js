const httpErrors = require("http-errors");
const Admin = require("../../models/Admin.model");

const getAdminMe = async (req, res, next) => {
  try {
    const currentUser = req.user;

    const user = await Admin.findOne({
      uuid: currentUser.uuid,
    });
    if (!user) throw new httpErrors.Unauthorized("Please login again");

    const admin = user.toObject();
    delete admin.twoFactor; // secrets, backup-code hashes
    delete admin.inviteTokenHash;
    res.status(200).json({
      success: true,
      message: "Me details fetched successfully",
      data: {
        ...admin,
        twoFactorEnabled: !!user.twoFactor?.enabled,
        // What the panel may show; the API enforces the same list.
        permissions: currentUser.permissions || [],
        isSuperAdmin: !!currentUser.isSuperAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAdminMe;
