const createHttpError = require("http-errors");
const User = require("../../models/User.model");
const PushNotification = require("../../models/PushNotification.model");
const { v4: generateUuid } = require("uuid");

const saveNotificationToken = async (req, res, next) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { uuid } = req.user;
    const existingUser = await User.findOne({ uuid });
    if (!existingUser) {
      throw new createHttpError.NotFound("User not found");
    }
    const { token, deviceName, deviceId, device } = req.body;
    if (!token) {
      throw new createHttpError.BadRequest("Notification token is required");
    }
    if (!deviceName || !deviceId || !device) {
      throw new createHttpError.BadRequest("Device information is incomplete");
    }

    const addNotificationToken = {
      updateOne: {
        // if the user already has a notification token, update it; otherwise, insert a new one
        filter: {
          user: existingUser.uuid, // still keeping user as safety if needed
          device,
          deviceId,
          deviceName,
        },
        update: {
          $set: {
            token, // assuming token is sent in the request body
            device,
            deviceId,
            deviceName,
          },
          $setOnInsert: {
            uuid: generateUuid(), // generate a new UUID for the notification token
          },
        },
        upsert: true,
      },
    };

    // bulkWrite to update or insert user coordinates
    await PushNotification.bulkWrite([addNotificationToken], { session });
    // Commit the transaction
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession(); // Always end the session
  }
};

module.exports = saveNotificationToken;
