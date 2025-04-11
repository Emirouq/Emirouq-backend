const dayjs = require("dayjs");
const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const User = require("../../models/User.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const UserSubscription = require("../../models/UserSubscription.model");

const accessChecker = async (userId) => {
  try {
    // 1. Get subscription details (using userId)
    const subscription = await UserSubscription.findOne({ user: userId });

    let planName = "free";
    let numberOfAdsAllowed = 1;
    let durationDays = 0;
    let isFreePlan = true; // track if the user is on the free plan

    //if the user has a subscription plan, get the details and update the variables.
    if (subscription?.subscriptionId) {
      const plan = subscription?.subscriptionPlan;
      planName = plan?.name;
      numberOfAdsAllowed = plan?.numberOfAds;
      durationDays = plan?.duration;
      isFreePlan = false; // User has a subscription plan, so they're not free
    }

    let startDate;

    // get the start date based on the plan type
    if (!isFreePlan && subscription?.subscriptionPlan?.startDate) {
      startDate = dayjs(
        subscription?.subscriptionPlan?.startDate
      ).toISOString();
    } else {
      // For free plan, consider a rolling 15-day window from their last post
      const lastPost = await Post.findOne({ userId }).sort({ createdAt: -1 });
      if (!lastPost) {
        return true;
      }
      startDate = dayjs(lastPost?.createdAt).subtract(15, "day")?.toISOString();
    }
    const endDate = dayjs().toISOString();

    // 2. Check Existing Posts (using userId)
    const postsByUser = await Post.find({
      userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({
      createdAt: -1,
    });

    if (isFreePlan) {
      //Logic to restrict the access based on the last post created.
      const lastPost = postsByUser[0];
      if (lastPost) {
        const differenceInDays = dayjs().diff(
          dayjs(lastPost?.createdAt),
          "day"
        );

        if (differenceInDays < 15) {
          throw httpErrors.Forbidden(
            `You can only post once every 15 days on the FREE plan.`
          );
        }
      }
    } else {
      //For the Non Free user will verify this access rules.
      if (planName !== "Business") {
        if (postsByUser?.length >= numberOfAdsAllowed) {
          throw httpErrors.Forbidden(
            `You have reached your limit of ${numberOfAdsAllowed} ads for the ${planName} plan.`
          );
        }
      }
    }

    return;
  } catch (error) {
    throw error;
  }
};

module.exports = { accessChecker };
