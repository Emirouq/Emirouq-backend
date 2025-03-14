const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const { sendEmail, generateOTP } = require("../../services/util/sendEmail");

const ResetPasswordModal = require("../../models/ResetPassword.model");

const UserModel = require("../../models/User.model");

const bcrypt = require("bcryptjs");

const Register = async (req, res, next) => {
  try {
    let { firstName, lastName, email, phoneNumber, password, confirmPassword } =
      req.body;

    if ((!email && !phoneNumber) || !password || !confirmPassword) {
      throw httpErrors.BadRequest(
        "Either Email or Phone Number, and passwords are required!"
      );
    }

    if (email) email = email.trim().toLowerCase();
    // if (phoneNumber) phoneNumber = phoneNumber.trim();

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
          "This phone number is already registered. Please try another one!"
        );
      }
    }

    if (password !== confirmPassword) {
      throw new httpErrors.BadRequest("Passwords do not match!");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP(4);
    const identifier = email || phoneNumber;
    const token = Buffer.from(`${identifier}:${otp}`).toString("base64");

    const existingResetEntry = await ResetPasswordModal.findOne({ email });
    if (existingResetEntry) {
      await ResetPasswordModal.deleteOne({ email });
    }

    const saveOtp = new ResetPasswordModal({
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      otp,
    });
    await saveOtp.save();
    console.log("otp", otp);
    const newUser = new UserModel({
      uuid: uuid(),
      firstName,
      lastName,
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      password: hashedPassword,
      isActive: false,
      isEmail: email ? true : false,
    });

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
};

module.exports = Register;
