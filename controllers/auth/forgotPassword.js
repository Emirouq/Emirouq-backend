const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const { sendEmail } = require("../../services/util/sendEmail");
const crypto = require("crypto");
const createError = require("http-errors");
const sendOTP = require("../../services/templates/sendOTP");

const forgotPassword = async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      throw createError.BadRequest("Email or phone number is required");
    }

    const user = await UserModal.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (!user) {
      throw createError.BadRequest("User not found");
    }

    const identifier = email || phoneNumber;

    await ResetPasswordModal.findOneAndDelete({
      $or: [{ email }, { phoneNumber }],
    });

    const otp = crypto.randomInt(1000, 9999);

    const token = Buffer.from(`${identifier}:${otp}`).toString("base64");

    const resetOtp = new ResetPasswordModal({
      otp,
      email,
      phoneNumber,
      isVerified: false,
    });
    await resetOtp.save();

    if (email) {
      await sendEmail(
        [email],
        `ONE TIME PASSWORD (OTP)`,
        sendOTP({ name: user?.firstName, otp })
      );
    }

    if (phoneNumber) {
      console.log(`Send OTP ${otp} to phone ${phoneNumber}`);
    }

    return res.status(200).send({
      message: "OTP sent successfully",
      token,
      otp,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = forgotPassword;
