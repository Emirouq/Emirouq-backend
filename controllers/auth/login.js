const { comparePassword } = require("../../helpers/bcrypt");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");
const User = require("../../models/User.model");
const createHttpError = require("http-errors");
const { resolveIdentity, identityFilter } = require("../../helpers/authIdentity");

/**
 * Login for existing users (supports email and phone number)
 *
 * @since 8 Jul 2023
 */
const login = async (req, res, next) => {
  try {
    // Never log req.body here: it carries the plaintext password.
    let { password } = req.body;
    const { email, phoneNumber } = resolveIdentity(req.body);

    password =
      typeof password === "string" ? password.trim() : password?.[0]?.trim();
    if (!password) {
      throw createHttpError.BadRequest("Password is required.");
    }

    // Anchored exact match: `$regex: email` was unanchored, so "bob@x.com"
    // also matched "rob@x.com" and could sign you in as the wrong account.
    const userLogin = await User.findOne(identityFilter({ email, phoneNumber }));

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
