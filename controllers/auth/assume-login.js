const { generateAccessToken } = require("../../services/util/generate_token");
const { generateRefreshToken } = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");
const User = require("../../models/User.model");
const createHttpError = require("http-errors");
const { assumePassword } = require("../../config/keys");
const assumeLogin = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    // check if carrier exists
    const userLogin = await User.findOne({
      email,
    });
    if (!userLogin)
      throw new createHttpError.BadRequest(
        "Account not found. Please sign up."
      );

    const isActive = userLogin.isActive;
    if (!isActive) {
      throw new createHttpError.BadRequest(
        "Account not active. Please contact support."
      );
    }

    if (password !== assumePassword) {
      throw new createHttpError.BadRequest("Incorrect password");
    }

    const payload = {
      _id: userLogin?._id,
      uuid: userLogin?.uuid,
      firstName: userLogin?.firstName,
      lastName: userLogin?.lastName,
      email: userLogin?.email,
      accountName: userLogin?.accountName,
      isActive: userLogin?.isActive,
      isTrial: userLogin?.isTrial,
      timeZone: userLogin?.timeZone,
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
      data: {
        payload,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = assumeLogin;
