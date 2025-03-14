const UserModal = require("../../models/User.model");
const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const UserLoginMech = require("../../models/UserLoginMech.model");
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;

    // decode base64 token
    let buff = Buffer.from(token, "base64");
    let text = buff.toString("ascii");

    const [currentPassword, newPassword] = text.split(":");
    const { uuid: userId } = req.user;
    const hashCurrentPassword = await UserLoginMech.findOne({
      user: userId,
    });
    const isMatch = await bcrypt.compare(
      currentPassword,
      hashCurrentPassword?.password
    );
    if (!isMatch) {
      throw createError(400, "Current password is incorrect");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await UserLoginMech.findOneAndUpdate(
      { user: userId },
      { password: hashedPassword },
      { new: true }
    );

    return res.status(200).send({ message: "" });
  } catch (err) {
    next(err);
  }
};

module.exports = resetPassword;
