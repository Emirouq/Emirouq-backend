const Notification = require("../../models/Notification.model");

const getUnreadCount = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;

    const count = await Notification.countDocuments({
      receiver: userId,
      isRead: false,
    });

    res.json({
      message: "Unread notification count fetched successfully",
      data: count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getUnreadCount;
