const dayjs = require("dayjs");
const Post = require("../../models/Post.model");
const UserModel = require("../../models/User.model");
const UserSubscription = require("../../models/UserSubscription.model");
const SupportTicket = require("../../models/Support.model");

const TIMEZONE = "Asia/Dubai";
const ALLOWED_RANGES = [7, 30, 90, 365];

// Percentage change between two periods. Returns null when there is no
// previous value to compare against, so the UI can show "new" instead of
// a misleading +100%.
const percentChange = (current, previous) => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const countBetween = (Model, from, to, extra = {}) =>
  Model.countDocuments({ ...extra, createdAt: { $gte: from, $lt: to } });

// Subscription dates come from Stripe, so they are unix seconds, not Dates.
const revenueBetween = async (from, to) => {
  const result = await UserSubscription.aggregate([
    {
      $match: {
        startDate: { $gte: dayjs(from).unix(), $lt: dayjs(to).unix() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$subscriptionPlan.amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return { total: result?.[0]?.total || 0, count: result?.[0]?.count || 0 };
};

const dailyCounts = (Model, from) =>
  Model.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: TIMEZONE,
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

const getDashboardOverview = async (req, res, next) => {
  try {
    const requestedDays = parseInt(req.query.days, 10);
    const days = ALLOWED_RANGES.includes(requestedDays) ? requestedDays : 30;

    const now = new Date();
    const periodStart = dayjs().subtract(days, "day").startOf("day").toDate();
    const previousStart = dayjs(periodStart).subtract(days, "day").toDate();

    const [
      totalUsers,
      activeUsers,
      newUsers,
      previousNewUsers,
      totalPosts,
      newPosts,
      previousNewPosts,
      postsByStatus,
      activeSubscriptions,
      subscriptionsByPlan,
      revenue,
      previousRevenue,
      openTickets,
      totalTickets,
      userTrend,
      postTrend,
      revenueTrend,
      topCategories,
      pendingPosts,
      recentUsers,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isActive: true }),
      countBetween(UserModel, periodStart, now),
      countBetween(UserModel, previousStart, periodStart),
      Post.countDocuments({}),
      countBetween(Post, periodStart, now),
      countBetween(Post, previousStart, periodStart),
      Post.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      UserSubscription.countDocuments({ status: "active" }),
      UserSubscription.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: "$subscriptionPlan.name",
            count: { $sum: 1 },
            amount: { $sum: "$subscriptionPlan.amount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      revenueBetween(periodStart, now),
      revenueBetween(previousStart, periodStart),
      SupportTicket.countDocuments({ responded: false }),
      SupportTicket.countDocuments({}),
      dailyCounts(UserModel, periodStart),
      dailyCounts(Post, periodStart),
      UserSubscription.aggregate([
        { $match: { startDate: { $gte: dayjs(periodStart).unix() } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: { $multiply: ["$startDate", 1000] } },
                timezone: TIMEZONE,
              },
            },
            amount: { $sum: "$subscriptionPlan.amount" },
          },
        },
      ]),
      Post.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "uuid",
            as: "category",
          },
        },
        {
          $project: {
            _id: 0,
            uuid: "$_id",
            count: 1,
            title: {
              $ifNull: [{ $arrayElemAt: ["$category.title", 0] }, "Unknown"],
            },
          },
        },
      ]),
      Post.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("uuid title price file createdAt location.name")
        .lean(),
      UserModel.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("uuid firstName lastName email profileImage createdAt")
        .lean(),
    ]);

    // Fill every day in the range so the chart has no gaps on quiet days.
    const toMap = (rows, key) =>
      Object.fromEntries(rows.map((row) => [row._id, row[key]]));
    const usersByDay = toMap(userTrend, "count");
    const postsByDay = toMap(postTrend, "count");
    const revenueByDay = toMap(revenueTrend, "amount");
    const trend = [];
    for (let i = days; i >= 0; i -= 1) {
      const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      trend.push({
        date,
        users: usersByDay[date] || 0,
        posts: postsByDay[date] || 0,
        revenue: revenueByDay[date] || 0,
      });
    }

    const statusCounts = Object.fromEntries(
      postsByStatus.map((row) => [row._id || "unknown", row.count])
    );

    res.json({
      message: "Fetched successfully",
      data: {
        days,
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          change: percentChange(newUsers, previousNewUsers),
        },
        posts: {
          total: totalPosts,
          new: newPosts,
          change: percentChange(newPosts, previousNewPosts),
          pending: statusCounts.pending || 0,
          byStatus: statusCounts,
        },
        subscriptions: {
          active: activeSubscriptions,
          byPlan: subscriptionsByPlan.map((row) => ({
            name: row._id,
            count: row.count,
            amount: row.amount,
          })),
        },
        revenue: {
          total: revenue.total,
          count: revenue.count,
          change: percentChange(revenue.total, previousRevenue.total),
          currency: "aed",
        },
        support: {
          open: openTickets,
          total: totalTickets,
        },
        trend,
        topCategories,
        pendingPosts,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getDashboardOverview;
