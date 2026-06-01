const Notification = require("../../models/Notification.model");

const getMyNotifications = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;

    const start = Number.parseInt(req.query.start ?? "0", 10);
    const limit = Number.parseInt(req.query.limit ?? "20", 10);
    const unreadOnly = req.query.unreadOnly === "true";

    const skip = Number.isFinite(start) && start > 0 ? start : 0;
    const take = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const baseFilter = {
      receiver: userId,
    };

    const filter = {
      ...baseFilter,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [data, count, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments(baseFilter),
      Notification.countDocuments({
        ...baseFilter,
        isRead: false,
      }),
    ]);

    res.json({
      message: "Notifications fetched successfully",
      data,
      count,
      totalCount,
      unreadCount,
      hasMore: skip + data.length < count,
      start: skip,
      limit: take,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getMyNotifications;
