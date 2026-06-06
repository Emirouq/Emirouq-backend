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
    password = typeof password === "string" ? password.trim() : password?.[0]?.trim();
    if (!password) {
      throw createHttpError.BadRequest("Password is required.");
    }

    if (email) email = email.trim().toLowerCase();

    // const userLogin = await User.findOne({
    //   $or: [{ email }, { phoneNumber }],
    // });
    let userLogin = await User.findOne({
      ...(phoneNumber && {
        phoneNumber,
      }),
      ...(email && {
        email: {
          $regex: email,
          $options: "i",
        },
        $or: [
          {
            oauthId: {
              $exists: false,
            },
          },
          {
            oauthId: {
              $eq: null,
            },
          },
          {
            oauthId: {
              $eq: "",
            },
          },
        ],
      }),
    });

    if (!userLogin && phoneNumber) {
      userLogin = await User.findOne({ phoneNumber });
    }
    if (!userLogin && email) {
      userLogin = await User.findOne({ email });
    }
    if (!userLogin) {
      throw createHttpError.BadRequest("Account not found. Please sign up.");
    }

    if (!userLogin.isActive) {
      throw createHttpError.BadRequest(
        "Account not active. Please contact support."
      );
    }

    if (!userLogin.password) {
      if (userLogin.oauthId && userLogin.oauthId !== "") {
        throw createHttpError.BadRequest(
          "This account uses social login. Please continue with Google, Facebook, or Apple."
        );
      }

      throw createHttpError.BadRequest(
        "This account does not have a password yet. Please reset your password or contact support."
      );
    }

    const isPasswordCorrect = await comparePassword(
      password,
      userLogin.password
    );
    if (!isPasswordCorrect) {
      throw createHttpError.BadRequest("Incorrect email or password.");
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
