const dayjs = require("dayjs");
const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");
const {
  SECRET_USER_FIELDS_PROJECTION,
  toPublicUser,
} = require("../../helpers/userProjection");

/**
 * Login for existing users
 *
 * @author Gurpreet
 * @since 1 June 2025
 */
const getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    // The app also calls this to show another user's profile. Only an admin,
    // or the user themself, gets the full record and the Stripe subscription;
    // everyone else gets the public profile.
    const isAdmin =
      req.user?.role === "Admin" && req.user?.permissions?.includes("users.view");
    const isSelf = req.user?.uuid === id;

    if (!isAdmin && !isSelf) {
      const user = await User.findOne({ uuid: id }).lean();
      return res.json({
        message: "Fetched successfully",
        data: toPublicUser(user) || null,
      });
    }

    const [data] = await User.aggregate([
      {
        $match: { uuid: id },
      },
      { $project: SECRET_USER_FIELDS_PROJECTION },
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
        },
      },
    ]);
    let subscription;
    if (data?.stripe?.subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(
        data.stripe.subscriptionId
      );
    }

    res.json({
      message: "Fetched successfully",
      data: {
        ...data,
        ...(subscription && { subscription }),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSingleUser;
