const Notification = require("../../models/Notification.model");

/**
 * Deletes all of the user's notifications, or only the read ones with
 * `?readOnly=true`.
 */
const clearNotifications = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const readOnly = req.query.readOnly === "true";

    const { deletedCount } = await Notification.deleteMany({
      receiver: userId,
      ...(readOnly ? { isRead: true } : {}),
    });

    const unreadCount = await Notification.countDocuments({
      receiver: userId,
      isRead: false,
    });

    res.json({
      message: "Notifications cleared",
      deletedCount,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = clearNotifications;
