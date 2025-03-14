const UserModel = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const createError = require("http-errors");

const verifyOTP = async (req, res, next) => {
  try {
    const { token } = req.params;

    let buff = Buffer.from(token, "base64");
    let text = buff.toString("ascii");
    let checkinType = "email";
    const [identifier, otp] = text.split(":");
    if (identifier?.includes("@")) {
      checkinType = "email";
    } else {
      checkinType = "phone";
    }
    console.log(identifier, otp);
    let verifyOtp;
    console.log("checkinType", checkinType);
    checkinType === "email"
      ? (verifyOtp = await ResetPasswordModal.findOne({
          email: identifier?.toLowerCase(),
          otp,
          isVerified: false,
        }).exec())
      : (verifyOtp = await ResetPasswordModal.findOne({
          phoneNumber: Number(identifier),
          otp,
          isVerified: false,
        }).exec());

    console.log("verifyOtp", verifyOtp);
    if (!verifyOtp) {
      throw createError.BadRequest("OTP is invalid or it may be expired!");
    }

    verifyOtp.isVerified = true;
    await verifyOtp.save();
    if (checkinType === "email") {
      await UserModel.findOneAndUpdate(
        { email: identifier?.toLowerCase() },
        { isActive: true },
        { new: true }
      );
    } else {
      await UserModel.findOneAndUpdate(
        { phoneNumber: identifier },
        { isActive: true },
        { new: true }
      );
    }

    res.status(200).send({
      message: "OTP verified successfully",
      identifier,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = verifyOTP;
