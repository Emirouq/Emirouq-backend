const Admin = require("../../models/Admin.model");

/** GET /admin/api/support/admins: who tickets can be assigned to. */
const listAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find({
      uuid: { $exists: true, $ne: null },
      isActive: { $ne: false },
    })
      .select("uuid firstName lastName email -_id")
      .lean();
    res.json({ message: "Admins", data: admins });
  } catch (error) {
    next(error);
  }
};

module.exports = listAdmins;
