const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");

const oauthLogin = async (req, res, next) => {
  try {
    let { firstName, lastName, email, phoneNumber, oauthId, profileImage } =
      req.body;
    if (email) {
      const user = await UserModel.findOne({
        email,
        oauthId,
      });
      if (user) {
        const payload = {
          _id: user?._id,
          uuid: user?.uuid,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          isActive: user?.isActive,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await Token.create({
          user: user?.uuid,
          token: refreshToken,
        });

        return res.status(201).json({
          accessToken,
          refreshToken,
          newUser: false,
        });
      }
    }

    const newUser = new UserModel({
      uuid: uuid(),
      firstName,
      lastName,
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      isActive: true,
      isEmail: true,
      profileImage,
      oauthId,
    });
    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
    });
    newUser.customerId = customer.id;
    await newUser.save();

    const payload = {
      _id: newUser?._id,
      uuid: newUser?.uuid,
      firstName: newUser?.firstName,
      lastName: newUser?.lastName,
      email: newUser?.email,
      isActive: newUser?.isActive,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await Token.create({
      user: newUser?.uuid,
      token: refreshToken,
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      newUser: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = oauthLogin;
