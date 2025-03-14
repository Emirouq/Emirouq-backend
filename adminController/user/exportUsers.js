const User = require("../../models/User.model");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const exportUsers = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { keyword, status, isActive } = req.query;
    if (keyword) {
      searchCriteria["$or"] = [
        { firstName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { lastName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { userHandle: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { email: { $regex: `^${keyword.trim()}`, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: `^${keyword.trim()}`,
              options: "i",
            },
          },
        },
      ];
    }
    if (isActive) {
      searchCriteria = {
        ...searchCriteria,
        isActive: isActive === "true" ? true : false,
      };
    }

    if (status) {
      switch (status) {
        case "all":
          break;
        case "active":
          searchCriteria = {
            ...searchCriteria,
            "stripe.subscriptionStatus": "active",
          };
          break;
        case "inactive":
          searchCriteria = {
            ...searchCriteria,
            "stripe.subscriptionStatus": "inactive",
            "stripe.subscriptionId": { $exists: true },
          };
          break;
        case "unsubscribed":
          searchCriteria = {
            ...searchCriteria,
            "stripe.subscriptionId": { $exists: false },
          };
          break;
        default:
          break;
      }
    }
    const data = await User.aggregate([
      {
        $match: {
          ...searchCriteria,
          role: "customer",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          userHandle: 1,
          isActive: 1,
          createdAt: 1,
          plan: "$limits.plan",
          accounts: "$limits.accounts",
          Storage: "$limits.storage",
          backtesting: "$limits.backtesting",
          customerId: "$stripe.customerId",
          subscriptionStatus: "$stripe.subscriptionStatus",
          subscriptionId: "$stripe.subscriptionId",
          subscriptionValidUntil: "$stripe.subscriptionValidUntil",
          defaultPaymentMethod: "$stripe.defaultPaymentMethod",
          cancel_at: "$stripe.cancel_at",
          canceled_at: "$stripe.canceled_at",
          isTrial: "$stripe.isTrial",
          trialEndsAt: "$stripe.trialEndsAt",
          isTrial: 1,
        },
      },
      // {
      //   $set: {
      //     createdAt: {
      //       $dateToString: {
      //         format: "%Y-%m-%d",
      //         date: "$createdAt",
      //       },
      //     },
      //     subscriptionValidUntil: {
      //       $dateToString: {
      //         format: "%Y-%m-%d",
      //         date: "$subscriptionValidUntil",
      //       },
      //     },

      //     trialEndsAt: {
      //       $dateToString: {
      //         format: "%Y-%m-%d",
      //         date: "$trialEndsAt",
      //       },
      //     },
      //   },
      // },
    ]);

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exportUsers;
