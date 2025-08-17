const UserModel = require("../../models/User.model");
const ProspectUser = require("../../models/ProspectUser.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const createError = require("http-errors");
const { v4: uuid } = require("uuid");
const verifyOTP = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { isForgotPassword } = req.body;

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
          phoneNumber: identifier,
          otp,
          isVerified: false,
        }).exec());

    // console.log("verifyOtp", verifyOtp);
    if (!verifyOtp) {
      throw createError.BadRequest("OTP is invalid or it may be expired!");
    }

    verifyOtp.isVerified = true;
    await verifyOtp.save();

    // if user wants to create account, then we will create user here, as isForgotPassword props will check that
    // else we will not create user
    if (!!isForgotPassword === false) {
      const prospectUser = await ProspectUser.findOne({
        ...(checkinType === "email" && {
          email: {
            $regex: identifier,
            $options: "i",
          },
        }),
        ...(checkinType === "phone" && { phoneNumber: identifier }),
      });
      //delete the unwanted fields
      delete prospectUser._doc._id;
      delete prospectUser._doc.__v;
      delete prospectUser._doc.createdAt;
      delete prospectUser._doc.updatedAt;
      delete prospectUser._doc.uuid;
      await UserModel.create({
        uuid: uuid(),
        ...prospectUser._doc,
      });
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
