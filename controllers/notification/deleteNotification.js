const httpErrors = require("http-errors");
const Notification = require("../../models/Notification.model");

const deleteNotification = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      uuid: id,
      receiver: userId,
    });

    if (!deleted) {
      throw httpErrors.NotFound("Notification not found");
    }

    const unreadCount = await Notification.countDocuments({
      receiver: userId,
      isRead: false,
    });

    res.json({
      message: "Notification deleted",
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteNotification;
