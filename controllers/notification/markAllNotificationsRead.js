const Notification = require("../../models/Notification.model");

/**
 * Marks the user's unread notifications read. With `:contextId` it only
 * touches that context, e.g. every notification of one chat conversation,
 * which the app calls when the user opens that chat.
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { contextId } = req.params;

    const { modifiedCount } = await Notification.updateMany(
      {
        receiver: userId,
        isRead: false,
        ...(contextId ? { contextId } : {}),
      },
      { $set: { isRead: true, readAt: new Date() } },
    );

    const unreadCount = await Notification.countDocuments({
      receiver: userId,
      isRead: false,
    });

    res.json({
      message: "Notifications marked as read",
      modifiedCount,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = markAllNotificationsRead;
