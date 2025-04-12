const dayjs = require("dayjs");
const httpErrors = require("http-errors");
const Post = require("../models/Post.model");

const accessChecker = async (userId, subscription) => {
  try {
    // 1. Get subscription details (using userId)

    let planName = "free";
    let numberOfAdsAllowed = 1;
    let isFreePlan = true; // track if the user is on the free plan
    let endDate = dayjs().add(15, "days").toDate();
    adType = "free"; // default ad type

    //if the user has a subscription plan, get the details and update the variables.
    if (subscription?.subscriptionId) {
      const plan = subscription?.subscriptionPlan;
      planName = plan?.name;
      numberOfAdsAllowed = plan?.numberOfAds;
      isFreePlan = false;
      endDate = dayjs.unix(subscription?.endDate).toDate();
      adType = "paid";
    }

    let startDate;

    // get the start date based on the plan type
    if (!isFreePlan && subscription?.startDate) {
      startDate = dayjs.unix(subscription?.startDate).toDate();
    } else {
      // For free plan, consider a rolling 15-day window from their last post
      const lastPost = await Post.findOne({
        userId,
        // check  for posts that are either pending or active
        isExpired: false,
        status: { $in: ["pending", "active"] },
        adType: "free",
      }).sort({ createdAt: -1 });
      if (!lastPost) {
        return { endDate };
      }
      startDate = dayjs(lastPost?.createdAt).subtract(15, "day")?.toDate();
    }

    // 2. Check Existing Posts (using userId)
    const postsByUser = await Post.find({
      userId,
      status: { $in: ["pending", "active"] },
      isExpired: false,
      createdAt: {
        $gte: startDate,
        $lte: dayjs().toDate(),
      },
      adType: adType,
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
        // i am adding +1 , since the user is creating a new post.
        // ex:  if the user has 2 posts, and he is creating a new one, then the total will be 3.
        // so we need to check if the user has reached the limit.
        if (postsByUser?.length + 1 >= numberOfAdsAllowed) {
          throw httpErrors.Forbidden(
            `You have reached your limit of ${numberOfAdsAllowed} ads for the ${planName} plan.`
          );
        }
      }
    }

    return {
      endDate,
    };
  } catch (error) {
    // Handle errors
    throw new Error(error?.message);
  }
};

module.exports = { accessChecker };
