const dayjs = require("dayjs");
const User = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [data] = await User.aggregate([
      {
        $match: { uuid: id },
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
