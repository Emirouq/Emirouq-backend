const { comparePassword } = require("../../helpers/bcrypt");
const { generateAccessToken } = require("../../services/util/generate_token");
const { generateRefreshToken } = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");
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

    const loginMech = await UserLoginMech.findOne({
      user: userLogin.uuid,
    });
    if (!loginMech?.password) {
      throw new createHttpError.BadRequest(
        "This admin account does not have a password set. Please contact support."
      );
    }
    // check if password is correct
    const isPasswordCorrect = await comparePassword(
      password,
      loginMech.password
    );
    if (!isPasswordCorrect)
      throw new createHttpError.BadRequest("Incorrect email or password");

    const payload = {
      _id: userLogin?._id,
      uuid: userLogin?.uuid,
      firstName: userLogin?.firstName,
      lastName: userLogin?.lastName,
      email: userLogin?.email,
      role: "Admin",
    };

    // generate access and refresh tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // save refresh token in db
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

module.exports = adminLogin;
