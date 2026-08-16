const httpErrors = require("http-errors");
const Notification = require("../../models/Notification.model");

const markNotificationRead = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { id } = req.params;

    const notification = await Notification.findOne({
      uuid: id,
      receiver: userId,
    });

    if (!notification) {
      throw httpErrors.NotFound("Notification not found");
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = markNotificationRead;
