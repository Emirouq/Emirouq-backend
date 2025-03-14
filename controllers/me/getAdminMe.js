const httpErrors = require("http-errors");
const Admin = require("../../models/Admin.model");

const getAdminMe = async (req, res, next) => {
  try {
    const currentUser = req.user;

    const user = await Admin.findOne({
      uuid: currentUser.uuid,
    });
    if (!user) throw new httpErrors.Unauthorized("Please login again");

    res.status(200).json({
      success: true,
      message: "Me details fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAdminMe;
