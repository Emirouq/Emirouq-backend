const createHttpError = require("http-errors");
const User = require("../../models/User.model");
const PushNotification = require("../../models/PushNotification.model");

const logout = async (req, res, next) => {
  try {
    const { uuid } = req.user;
    const { deviceId } = req.body;
    const existingUser = await User.findOne({ uuid });

    if (!existingUser) {
      throw new createHttpError.NotFound("User not found");
    }

    if (deviceId) {
      await PushNotification.updateOne(
        { user: uuid, deviceId },
        { $set: { loggedIn: false } },
      );
    } else {
      await PushNotification.updateMany(
        { user: uuid },
        { $set: { loggedIn: false } },
      );
    }

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = logout;
