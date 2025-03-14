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
    const { email, password } = req.body;

    // check if carrier exists
    const userLogin = await AdminModel.findOne({
      email,
    });
    if (!userLogin)
      throw new createHttpError.BadRequest(
        "Account not found. Please sign up."
      );

    const loginMech = await UserLoginMech.findOne({
      user: userLogin.uuid,
    });
    // check if password is correct
    const isPasswordCorrect = await comparePassword(
      password,
      loginMech.password
    );
    if (!isPasswordCorrect)
      throw new createHttpError.BadRequest("Incorrect password");

    const payload = {
      _id: userLogin?._id,
      uuid: userLogin?.uuid,
      firstName: userLogin?.firstName,
      lastName: userLogin?.lastName,
      email: userLogin?.email,
      role: "admin",
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
