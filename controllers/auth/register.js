const httpErrors = require("http-errors");
const formidable = require("formidable");
const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const { upload } = require("../../services/util/upload-files");
const { sendEmail, generateOTP } = require("../../services/util/sendEmail");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const UserModel = require("../../models/User.model");
const registerTemplate = require("../../services/templates/register");

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

const Register = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          throw httpErrors.BadRequest("Error parsing form data");
        }

        let {
          firstName,
          lastName,
          email,
          phoneNumber,
          password,
          confirmPassword,
          bio,
          userInterest,
        } = fields;
        console.log("fields", fields);
        if ((!email && !phoneNumber) || !password || !confirmPassword) {
          throw httpErrors.BadRequest(
            "Either Email or Phone Number,and passwords are required!"
          );
        }

        if (email) email = email[0].trim().toLowerCase();
        if (userInterest) {
          try {
            userInterest = JSON.parse(userInterest[0]);
            if (
              !Array.isArray(userInterest) ||
              userInterest.some((item) => typeof item !== "string")
            ) {
              throw new Error();
            }
          } catch (error) {
            throw httpErrors.BadRequest(
              "Invalid userInterest format. It should be an array of strings."
            );
          }
        }

        if (email) {
          const checkIfEmailExist = await UserModel.findOne({ email });
          if (checkIfEmailExist) {
            throw new httpErrors.Conflict(
              "This email is already registered. Please try another one!"
            );
          }
        }

        if (phoneNumber) {
          const checkIfPhoneExist = await UserModel.findOne({ phoneNumber });
          if (checkIfPhoneExist) {
            throw new httpErrors.Conflict(
              "This phone number is already registered."
            );
          }
        }
        const checkIfEmailExistInOauth = await UserModel.findOne({
          email,
          oauthId: {
            $exists: true,
          },
        });
        if (checkIfEmailExistInOauth) {
          throw new httpErrors.Conflict(
            "This email is already registered with a social account. Please try another one!"
          );
        }
        if (password[0] !== confirmPassword[0]) {
          throw new httpErrors.BadRequest("Passwords do not match!");
        }
        console.log("password", password);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password[0], salt);

        const otp = generateOTP(4);
        const identifier = email || phoneNumber;
        const token = Buffer.from(`${identifier}:${otp}`).toString("base64");

        if (email) {
          await ResetPasswordModal.deleteOne({ email });
        }

        const saveOtp = new ResetPasswordModal({
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber }),
          otp,
        });
        await saveOtp.save();

        let profileImage = null;
        if (files?.profileImage) {
          const uploadedFile = await uploadFilesToAws(
            files.profileImage[0],
            "users"
          );
          profileImage = uploadedFile.url;
        }
        const newUser = new UserModel({
          uuid: uuid(),
          firstName: firstName?.[0],
          ...(lastName && { lastName: lastName?.[0] }),
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber }),
          ...(bio && { bio }),
          password: hashedPassword,
          isActive: false,
          isEmail: email ? true : false,
          ...(profileImage && { profileImage }),
          userInterest: userInterest || [],
        });
        if (email) {
          await sendEmail(
            [email],
            `Welcome to Emirouq`,
            registerTemplate({ name: `${firstName} ${lastName || ""}`, otp })
          );
        }
        await newUser.save();

        res.status(201).json({
          message:
            "User registered successfully! Please verify your email or phone number.",
          otp,
          token,
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = Register;
