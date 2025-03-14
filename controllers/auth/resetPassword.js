const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const userLoginMech = require("../../models/UserLoginMech.model");
const bcrypt = require("bcryptjs");
const createError = require("http-errors");

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      throw createError.BadRequest(
        "Password and Confirm Password are required"
      );
    }
    if (password !== confirmPassword) {
      throw createError.BadRequest("Passwords do not match");
    }

    // Decode Base64 token
    let buff = Buffer.from(token, "base64");
    let text = buff.toString("ascii");

    const [identifier, otp] = text.split(":"); // Supports both email and phoneNumber

    // Find verified OTP entry
    const otpCheck = await ResetPasswordModal.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
      otp,
      isVerified: true,
    });

    if (!otpCheck) {
      throw createError.BadRequest("OTP is invalid or expired!");
    }

    // Find user based on identifier
    const user = await UserModal.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
    });

    if (!user) {
      throw createError.BadRequest("User not found");
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("hashedPassword", hashedPassword);
    // Update password in UserLoginMech
    const aa = await UserModal.findOneAndUpdate(
      { uuid: user.uuid },
      { password: hashedPassword },
      { new: true }
    );
    console.log("aa", aa);
    // Delete OTP entry after successful password reset
    await ResetPasswordModal.findOneAndDelete({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
    });

    res.status(200).send({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = resetPassword;
