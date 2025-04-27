const { comparePassword } = require("../../helpers/bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");
const User = require("../../models/User.model");
const createHttpError = require("http-errors");

/**
 * Login for existing users (supports email and phone number)
 *
 * @since 8 Jul 2023
 */
const login = async (req, res, next) => {
  try {
    console.log(req.body);
    let { email, phoneNumber, password } = req.body;
    if (!email && !phoneNumber) {
      throw createHttpError.BadRequest("Email or phone number is required.");
    }

    if (email) email = email.trim().toLowerCase();
    console.log("email", email);

    // const userLogin = await User.findOne({
    //   $or: [{ email }, { phoneNumber }],
    // });
    let userLogin = await User.findOne({
      email,
      oauthId: {
        $exists: false,
        $eq: null,
      },
    });

    if (!userLogin) {
      userLogin = await User.findOne({ phoneNumber });
    }
    if (!userLogin) {
      throw createHttpError.BadRequest("Account not found. Please sign up.");
    }

    if (!userLogin.isActive) {
      throw createHttpError.BadRequest(
        "Account not active. Please contact support."
      );
    }
    console.log("password", password, userLogin.password);
    const isPasswordCorrect = await comparePassword(
      password,
      userLogin.password
    );
    if (!isPasswordCorrect) {
      throw createHttpError.BadRequest("Incorrect password.");
    }

    const payload = {
      _id: userLogin._id,
      uuid: userLogin.uuid,
      firstName: userLogin.firstName,
      lastName: userLogin.lastName,
      email: userLogin.email || null,
      phoneNumber: userLogin.phoneNumber || null,
      isActive: userLogin.isActive,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await Token.create({
      user: userLogin.uuid,
      token: refreshToken,
    });

    res.status(200).json({
      loggedin: true,
      message: "Login successful",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = login;
