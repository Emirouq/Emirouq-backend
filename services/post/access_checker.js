const dayjs = require("dayjs");
const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const User = require("../../models/User.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const accessChecker = async (userId) => {
  try {
    // 1. Get User & Plan Details
    const user = await User.findOne({ uuid: userId }, { subscriptionPlan: 1 });

    let planName = "free";
    let numberOfAdsAllowed = 1;
    let durationDays = 0;
    let isFreePlan = true; // track if the user is on the free plan

    if (user?.subscriptionPlan?.plan !== "free") {
      const plan = user.subscriptionPlan;
      planName = plan?.name;
      numberOfAdsAllowed = plan?.numberOfAds;
      durationDays = plan?.duration;
      isFreePlan = false; // User has a subscription plan, so they're not free
    }

    // 2. Check Existing Posts (using creatorId)
    const postsByUser = await Post.find({ userId }).sort({
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

      // Time-Based Limits (Basic & Starter)
      if (["Basic", "Starter"].includes(planName)) {
        const lastPost = postsByUser[0];
        if (lastPost) {
          const differenceInDays = dayjs().diff(
            dayjs(lastPost.createdAt),
            "day"
          );
          let allowedInterval = 0;
          if (planName === "Basic") {
            allowedInterval = 7;
          } else if (planName === "Starter") {
            allowedInterval = 14;
          }

          if (differenceInDays < allowedInterval) {
            throw httpErrors.Forbidden(
              `You can only post once every ${allowedInterval} days on the ${planName} plan.`
            );
          }
        }
      }
    }

    // 5. Allow Access
    return true;
  } catch (error) {
    console.error("Access check failed:", error);
    throw error;
  }
};

module.exports = { accessChecker };
