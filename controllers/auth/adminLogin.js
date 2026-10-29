const { comparePassword } = require("../../helpers/bcrypt");
const { createChallengeToken } = require("../../helpers/adminTwoFactor");
const AdminModel = require("../../models/Admin.model");
const UserLoginMech = require("../../models/UserLoginMech.model");
const createHttpError = require("http-errors");

/**
 * Login for existing users
 *
 * @author
 * @since 8 Jul 2023
 */
const adminLogin = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (!email) {
      throw new createHttpError.BadRequest("Email is required.");
    }
    password = typeof password === "string" ? password.trim() : password?.[0]?.trim();
    if (!password) {
      throw new createHttpError.BadRequest("Password is required.");
    }

    // check if carrier exists
    const userLogin = await AdminModel.findOne({
      email: email?.trim()?.toLowerCase(),
    });
    if (!userLogin)
      throw new createHttpError.BadRequest(
        "Account not found. Please sign up."
      );

    if (!userLogin.uuid) {
      // Old, half-created admin record; it cannot have a session.
      throw new createHttpError.BadRequest(
        "This admin account is not set up correctly. Ask a Super Admin to invite you again."
      );
    }
    if (userLogin.isActive === false) {
      throw new createHttpError.Forbidden(
        "Your admin access has been revoked. Contact a Super Admin."
      );
    }

    const loginMech = await UserLoginMech.findOne({
      user: userLogin.uuid,
    });
    if (!loginMech?.password) {
      throw new createHttpError.BadRequest(
        userLogin.inviteTokenHash
          ? "Finish setting up your account with the link in your invitation email."
          : "This admin account does not have a password set. Please contact support."
      );
    }
    // check if password is correct
    const isPasswordCorrect = await comparePassword(
      password,
      loginMech.password
    );
    if (!isPasswordCorrect)
      throw new createHttpError.BadRequest("Incorrect email or password");

    // Password is right, but that alone no longer signs an admin in: every
    // admin also confirms an authenticator-app code (or sets one up first).
    res.status(200).json({
      loggedin: false,
      twoFactorRequired: true,
      setupRequired: !userLogin?.twoFactor?.enabled,
      challengeToken: createChallengeToken(userLogin),
      message: userLogin?.twoFactor?.enabled
        ? "Enter the code from your authenticator app."
        : "Set up two-factor authentication to continue.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = adminLogin;
