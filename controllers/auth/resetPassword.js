const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const bcrypt = require("bcryptjs");
const createError = require("http-errors");
const {
  emitVerificationNotification,
} = require("../../services/notification/verificationNotifications");
const {
  decodeOtpToken,
  identityFilter,
  assertPasswordStrength,
} = require("../../helpers/authIdentity");

/**
 * Sets a new password using the token returned by `verifyOTP`.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    assertPasswordStrength(password, confirmPassword);

    const { otp, isEmail, email, phoneNumber } = decodeOtpToken(token);

    // This check used to be commented out, which meant the token was never
    // verified: anyone who could build base64("<email>:<anything>") could set
    // a new password on that account. The OTP must exist AND be verified, and
    // the record expires five minutes after it was issued.
    const otpRecord = await ResetPasswordModal.findOne({
      ...(isEmail ? { email } : { phoneNumber }),
      otp,
      isVerified: true,
    });

    if (!otpRecord) {
      throw createError.BadRequest(
        "This reset link is invalid or has expired. Please request a new code.",
      );
    }

    const user = await UserModal.findOne(identityFilter({ email, phoneNumber }));

    if (!user) {
      throw createError.BadRequest("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await UserModal.findOneAndUpdate(
      { uuid: user.uuid },
      { password: hashedPassword },
      { new: true },
    );

    await emitVerificationNotification(user, "password_changed", {
      contextId: `password_changed:${user.uuid}:${Date.now()}`,
      contextType: "security",
      dedupe: false,
      push: true,
    });

    // Single use: burn the OTP so the same token cannot reset twice.
    await ResetPasswordModal.deleteOne({ _id: otpRecord._id });

    res.status(200).send({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = resetPassword;
