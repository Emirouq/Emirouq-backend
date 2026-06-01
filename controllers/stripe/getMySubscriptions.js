const dayjs = require("dayjs");
const UserSubscription = require("../../models/UserSubscription.model");
const Category = require("../../models/Category.model");
const Post = require("../../models/Post.model");

const sortSubscriptions = (a, b) => {
  const statusOrder = {
    active: 0,
    trialing: 1,
    inactive: 2,
    canceled: 3,
  };

  const statusDiff =
    (statusOrder[a?.status] ?? 99) - (statusOrder[b?.status] ?? 99);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const endDateDiff = (Number(b?.endDate) || 0) - (Number(a?.endDate) || 0);
  if (endDateDiff !== 0) {
    return endDateDiff;
  }

  return (Number(b?.startDate) || 0) - (Number(a?.startDate) || 0);
};

const getPostsUsedCount = async ({ userId, subscription }) => {
  const query = {
    userId,
    subscriptionId: subscription?.subscriptionId,
    adType: "paid",
    isExpired: false,
    status: { $in: ["pending", "active"] },
  };

  const startDate = Number(subscription?.startDate);
  const endDate = Number(subscription?.endDate);

  if (Number.isFinite(startDate) && startDate > 0) {
    query.createdAt = {
      ...query.createdAt,
      $gte: dayjs.unix(startDate).toDate(),
    };
  }

  if (Number.isFinite(endDate) && endDate > 0) {
    query.createdAt = {
      ...query.createdAt,
      $lte: dayjs.unix(endDate).toDate(),
    };
  }

  return Post.countDocuments(query);
};

const getMySubscriptions = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const subscriptions = await UserSubscription.find({ user: userId }).lean();

    const latestByCategory = new Map();
    for (const subscription of subscriptions.sort(sortSubscriptions)) {
      const categoryId =
        subscription?.subscriptionPlan?.categoryId || subscription?.uuid;
      if (!latestByCategory.has(categoryId)) {
        latestByCategory.set(categoryId, subscription);
      }
    }

    const currentSubscriptions = Array.from(latestByCategory.values());
    const categoryIds = currentSubscriptions
      .map((subscription) => subscription?.subscriptionPlan?.categoryId)
      .filter(Boolean);

    const categories = await Category.find({
      uuid: { $in: categoryIds },
    })
      .select("uuid title logo")
      .lean();

    const categoryMap = new Map(
      categories.map((category) => [category.uuid, category]),
    );

    const data = await Promise.all(
      currentSubscriptions.map(async (subscription) => {
        const postsUsed = await getPostsUsedCount({
          userId,
          subscription,
        });

        return {
          ...subscription,
          category:
            categoryMap.get(subscription?.subscriptionPlan?.categoryId) || null,
          postsUsed,
        };
      }),
    );

    res.json({
      message: "User subscriptions fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getMySubscriptions;
