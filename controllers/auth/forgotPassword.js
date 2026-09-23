const UserModal = require("../../models/User.model");
const ProspectUser = require("../../models/ProspectUser.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const { sendEmail, generateOTP } = require("../../services/util/sendEmail");
const createError = require("http-errors");
const sendOTP = require("../../services/templates/sendOTP");
const {
  resolveIdentity,
  identityFilter,
  encodeOtpToken,
  shouldExposeOtp,
} = require("../../helpers/authIdentity");

/**
 * Sends a one time password, either to verify a new signup (isForgotPassword
 * falsy -> ProspectUser) or to reset an existing password (-> User).
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { isForgotPassword } = req.body;
    const { email, phoneNumber, identifier } = resolveIdentity(req.body);

    // TODO: no SMS provider is wired up yet. Checked before anything is written
    // so the caller gets a clear 501 instead of a silently undelivered code.
    // Set AUTH_EXPOSE_OTP=true locally to work on the flow without SMS.
    if (phoneNumber && !shouldExposeOtp()) {
      throw createError.NotImplemented(
        "SMS delivery is not available yet. Please use your email address.",
      );
    }

    // isForgotPassword => the account already exists; otherwise it is still a prospect
    const Model = isForgotPassword ? UserModal : ProspectUser;

    // The previous query only ever looked at `email`, with `$regex: undefined`
    // when a phone number was supplied, so the phone flow could never work.
    const user = await Model.findOne(identityFilter({ email, phoneNumber }));

    if (!user) {
      throw createError.BadRequest("User not found");
    }

    await ResetPasswordModal.deleteMany(
      email ? { email } : { phoneNumber },
    );

    const otp = generateOTP();
    const token = encodeOtpToken(identifier, otp);

    await new ResetPasswordModal({
      otp,
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      isVerified: false,
    }).save();

    if (email) {
      await sendEmail(
        [email],
        `ONE TIME PASSWORD (OTP)`,
        sendOTP({ name: user?.firstName, otp }),
      );
    }

    return res.status(200).send({
      message: "OTP sent successfully",
      token,
      // Never returned in production: anyone could read it and take over an
      // account without access to the mailbox or handset.
      ...(shouldExposeOtp() && { otp }),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = forgotPassword;
