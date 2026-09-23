const UserModel = require("../../models/User.model");
const ProspectUser = require("../../models/ProspectUser.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const createError = require("http-errors");
const { v4: uuid } = require("uuid");
const {
  decodeOtpToken,
  identityFilter,
  encodeOtpToken,
} = require("../../helpers/authIdentity");

/**
 * Verifies a one time password.
 *
 * For a signup this promotes the ProspectUser into a real User. For a password
 * reset it only marks the OTP verified; `resetPassword` then requires that
 * verified record, so the reset cannot be performed without this step.
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { isForgotPassword } = req.body;

    const { identifier, otp, isEmail, email, phoneNumber } =
      decodeOtpToken(token);

    const verifyOtp = await ResetPasswordModal.findOne({
      ...(isEmail ? { email } : { phoneNumber }),
      otp,
      isVerified: false,
    }).exec();

    if (!verifyOtp) {
      throw createError.BadRequest("OTP is invalid or it may be expired!");
    }

    verifyOtp.isVerified = true;
    await verifyOtp.save();

    // Signup flow: turn the prospect into a real account.
    if (!isForgotPassword) {
      const prospectUser = await ProspectUser.findOne(
        identityFilter({ email, phoneNumber }),
      );

      // The old code dereferenced `prospectUser._doc` unconditionally, so a
      // missing prospect record produced a 500 instead of a usable message.
      if (!prospectUser) {
        throw createError.BadRequest(
          "We could not find your signup details. Please register again.",
        );
      }

      const existingUser = await UserModel.findOne(
        identityFilter({ email, phoneNumber }),
      );

      if (existingUser) {
        await ProspectUser.deleteOne({ _id: prospectUser._id });
        throw createError.Conflict(
          "This account is already verified. Please sign in.",
        );
      }

      const {
        _id,
        __v,
        createdAt,
        updatedAt,
        uuid: prospectUuid,
        ...prospectFields
      } = prospectUser.toObject();

      await UserModel.create({
        ...prospectFields,
        uuid: uuid(),
        isActive: true,
      });

      // Promoted — the prospect row would otherwise block a later re-signup.
      await ProspectUser.deleteOne({ _id: prospectUser._id });
      await ResetPasswordModal.deleteOne({ _id: verifyOtp._id });
    }

    res.status(200).send({
      message: "OTP verified successfully",
      identifier,
      // Proof for `resetPassword` that this OTP was checked. It stays valid
      // only while the ResetPassword record lives (5 minutes).
      ...(isForgotPassword && { resetToken: encodeOtpToken(identifier, otp) }),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = verifyOTP;
