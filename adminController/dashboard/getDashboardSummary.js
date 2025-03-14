const dayjs = require("dayjs");
const Transaction = require("../../models/Transaction.model");
const UserModel = require("../../models/User.model");

const getDashboardSummary = async (req, res, next) => {
  try {
    const [
      totalIncome,
      totalActiveSubscribers,
      totalUsers,
      userCancelSubscription,
      cancelledSubscribers,
      report,
    ] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            sum: { $sum: "$amount" },
            tax: { $sum: "$tax" },
            count: { $sum: 1 },
          },
        },
      ]),
      UserModel.aggregate([
        {
          $match: {
            "stripe.subscriptionStatus": "active",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]),
      UserModel.aggregate([
        {
          $match: {
            // createdAt: {
            //   $gt: new Date(getStartOfThisMonth()),
            // },
          },
        },
      ]),
      UserModel.aggregate([
        {
          $match: {
            "stripe.subscriptionStatus": "active",
            "stripe.canceled_at": {
              $lte: dayjs().unix(),
            },
            "stripe.cancel_at": {
              $gt: dayjs().unix(),
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]),
      UserModel.aggregate([
        {
          $match: {
            "stripe.subscriptionStatus": "inactive",
            "stripe.cancel_at": {
              $lte: dayjs().unix(),
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $set: {
            year: {
              $year: { date: "$createdAt", timezone: "America/New_York" },
            },
            month: {
              $month: { date: "$createdAt", timezone: "America/New_York" },
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%b-%Y",
                date: "$createdAt",
                timezone: "America/New_York",
              },
            },
            year: {
              $first: "$year",
            },
            month: {
              $first: "$month",
            },

            totalAmount: {
              $sum: "$amount",
            },
            tax: {
              $sum: "$tax",
            },
          },
        },
        {
          $sort: {
            year: 1,
            month: 1,
          },
        },
        {
          $project: {
            label: "$_id",
            totalAmount: {
              $divide: ["$totalAmount", 100],
            },
            tax: 1,
          },
        },
      ]),
    ]);

    res.json({
      message: "Fetched successfully",
      data: {
        totalIncome: totalIncome?.[0]?.sum || 0,
        totalTax: totalIncome?.[0]?.tax || 0,
        totalActiveSubscribers: totalActiveSubscribers?.[0]?.count,
        totalUsers: totalUsers?.length,
        userCancelSubscription: userCancelSubscription?.[0]?.count,
        cancelledSubscribers: cancelledSubscribers?.[0]?.count,
        report,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getDashboardSummary;
