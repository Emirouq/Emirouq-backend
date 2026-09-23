const httpErrors = require("http-errors");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const { upload } = require("../../services/util/upload-files");
const { sendEmail, generateOTP } = require("../../services/util/sendEmail");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const UserModel = require("../../models/User.model");
const ProspectUser = require("../../models/ProspectUser.model");
const registerTemplate = require("../../services/templates/register");
const {
  resolveIdentity,
  identityFilter,
  assertPasswordStrength,
  encodeOtpToken,
  shouldExposeOtp,
} = require("../../helpers/authIdentity");

const uploadFilesToAws = async (files, folderName) => {
  const location = files?.path || files?.filepath;
  const originalFileName = files?.name || files?.originalFilename;
  const fileType = files?.type || files?.mimetype;
  const data = await upload(location, originalFileName, folderName, fileType);
  return {
    url: data?.Location,
    type: fileType,
    name: originalFileName,
    uuid: uuid(),
  };
};

/** formidable v3 gives every field as an array. */
const first = (field) =>
  Array.isArray(field) ? field[0] : field === undefined ? undefined : field;

const trimmed = (field) => {
  const value = first(field);
  return typeof value === "string" ? value.trim() : value;
};

const Register = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        const firstName = trimmed(fields.firstName);
        const lastName = trimmed(fields.lastName);
        const bio = trimmed(fields.bio);
        const password = first(fields.password);
        const confirmPassword = first(fields.confirmPassword);

        if (!firstName) {
          throw httpErrors.BadRequest("First name is required.");
        }

        const { email, phoneNumber, identifier, isEmail } = resolveIdentity({
          email: fields.email,
          phoneNumber: fields.phoneNumber,
        });

        assertPasswordStrength(password, confirmPassword);

        // TODO: wire up an SMS provider. Checked up front so a phone signup
        // fails before any record is written. Set AUTH_EXPOSE_OTP=true locally
        // to work on the flow without SMS.
        if (phoneNumber && !shouldExposeOtp()) {
          throw httpErrors.NotImplemented(
            "SMS delivery is not available yet. Please sign up with an email address.",
          );
        }

        let userInterest = first(fields.userInterest);
        if (userInterest) {
          try {
            userInterest = JSON.parse(userInterest);
            if (
              !Array.isArray(userInterest) ||
              userInterest.some((item) => typeof item !== "string")
            ) {
              throw new Error();
            }
          } catch (error) {
            throw httpErrors.BadRequest(
              "Invalid userInterest format. It should be an array of strings.",
            );
          }
        }

        const filter = identityFilter({ email, phoneNumber });

        // Anchored exact match. The previous `$regex: email` was an unanchored
        // substring match, so an unrelated address containing this one counted
        // as "already registered".
        if (email) {
          const emailTaken = await UserModel.findOne({
            ...filter,
            $or: [
              { oauthId: { $exists: false } },
              { oauthId: { $in: [null, ""] } },
            ],
          });
          if (emailTaken) {
            throw new httpErrors.Conflict(
              "This email is already registered. Please try another one!",
            );
          }
        } else {
          const phoneTaken = await UserModel.findOne(filter);
          if (phoneTaken) {
            throw new httpErrors.Conflict(
              "This phone number is already registered.",
            );
          }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = generateOTP();
        const token = encodeOtpToken(identifier, otp);

        await ResetPasswordModal.deleteMany(
          email ? { email } : { phoneNumber },
        );
        // A prospect from an abandoned attempt would otherwise stay behind and
        // be picked up by verifyOTP with the old password.
        await ProspectUser.deleteMany(filter);

        await new ResetPasswordModal({
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber }),
          otp,
        }).save();

        let profileImage = null;
        if (files?.profileImage) {
          const uploadedFile = await uploadFilesToAws(
            first(files.profileImage),
            "users",
          );
          profileImage = uploadedFile.url;
        }

        const newUser = new ProspectUser({
          uuid: uuid(),
          firstName,
          ...(lastName && { lastName }),
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber }),
          ...(bio && { bio }),
          password: hashedPassword,
          isActive: false,
          isEmail,
          ...(profileImage && { profileImage }),
          userInterest: userInterest || [],
        });

        // Saved before the email goes out, so a mail failure cannot leave an
        // OTP with nothing to verify.
        await newUser.save();

        if (email) {
          try {
            await sendEmail(
              [email],
              `Welcome to Emirouq`,
              registerTemplate({ name: `${firstName} ${lastName || ""}`, otp }),
            );
          } catch (emailError) {
            console.error("Failed to send registration email:", emailError);
            throw httpErrors.InternalServerError(
              "Failed to send verification email. Please try again later.",
            );
          }
        }

        res.status(201).json({
          message:
            "User registered successfully! Please verify your email or phone number.",
          token,
          // Development only — see shouldExposeOtp().
          ...(shouldExposeOtp() && { otp }),
        });
      } catch (error) {
        return next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = Register;
