const dayjs = require("dayjs");
const User = require("../../models/User.model");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const getAllUsers = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword, status, isActive } = req.query;
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
            "stripe.canceled_at": { $exists: true },
          };
          break;
        case "unsubscribed":
          searchCriteria = {
            ...searchCriteria,
            notSubscribedOnce: true,
          };
          break;
        case "cancelled":
          searchCriteria = {
            ...searchCriteria,
            "stripe.subscriptionStatus": "active",
            "stripe.canceled_at": {
              $lte: dayjs().unix(),
            },
            "stripe.cancel_at": {
              $gt: dayjs().unix(),
            },
          };
          break;
        case "cancel":
          searchCriteria = {
            ...searchCriteria,
            "stripe.subscriptionStatus": "inactive",
            "stripe.cancel_at": {
              $lte: dayjs().unix(),
            },
          };
          break;
        default:
          break;
      }
    }
    const data = await User.aggregate([
      {
        $match: {
          role: "customer",
        },
      },
      {
        $set: {
          isRequestedCancellation: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$stripe.subscriptionStatus", "active"] },
                  { $gt: ["$stripe.cancel_at", dayjs().unix()] },
                  {
                    $lte: ["$stripe.canceled_at", dayjs().unix()],
                  },
                ],
              },
              then: true,
              else: false,
            },
          },
          notSubscribedOnce: {
            $cond: {
              if: {
                $and: [
                  { $eq: [{ $ifNull: ["$stripe.canceled_at", null] }, null] },
                  {
                    $eq: [{ $ifNull: ["$stripe.subscriptionId", null] }, null],
                  },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $match: searchCriteria,
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: parseInt(start || 0),
            },
            {
              $limit: parseInt(limit || 10),
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllUsers;
