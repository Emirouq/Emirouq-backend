const dayjs = require("dayjs");
const httpErrors = require("http-errors");
const UserSubscription = require("../models/UserSubscription.model");
const { accessChecker } = require("../middlewares/access_checker");

/**
 * One place that answers "may this user publish an ad in this category?".
 *
 * Every write path that can make an ad live has to go through this. Previously
 * `addPost` looked a subscription up, passed `undefined` to `accessChecker`
 * when there was none, and `accessChecker` quietly treated that as the free
 * plan — so an ad went live in a category the user had never paid for.
 * `updatePost` had no check at all, so saving a draft and then publishing it
 * skipped the paywall completely.
 */

/** `status` values that count as a live subscription. */
const ACTIVE_STATUSES = ["active"];

/**
 * The cancel webhook writes "cancelled" while the schema enum says "canceled".
 * `findOneAndUpdate` does not run validators, so both spellings exist in the
 * data. Neither is active, so both are simply excluded here.
 */
const INACTIVE_STATUSES = ["inactive", "canceled", "cancelled"];

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * `endDate` is a Unix timestamp in seconds. A subscription with no endDate is
 * treated as open-ended rather than expired.
 */
const isWithinTerm = (subscription) =>
  !subscription?.endDate || subscription.endDate > nowInSeconds();

/**
 * The user's live subscription for one category, or null.
 */
const getActiveCategorySubscription = async (userId, categoryId) => {
  if (!userId || !categoryId) return null;

  const subscription = await UserSubscription.findOne({
    user: userId,
    status: { $in: ACTIVE_STATUSES },
    "subscriptionPlan.categoryId": categoryId,
  }).sort({ endDate: -1 });

  if (!subscription || !isWithinTerm(subscription)) return null;

  return subscription;
};

/**
 * Throws 403 unless the user may publish in `categoryId`, and returns the
 * subscription plus the expiry to stamp on the post.
 *
 * @returns {Promise<{ subscription: object, endDate: Date|number }>}
 */
const assertCanPublishInCategory = async (userId, categoryId) => {
  if (!categoryId) {
    throw httpErrors.BadRequest("Category Id is required");
  }

  const subscription = await getActiveCategorySubscription(userId, categoryId);

  if (!subscription) {
    // Distinguish "never subscribed" from "subscription ran out", so the app
    // can tell the user something useful.
    const lapsed = await UserSubscription.findOne({
      user: userId,
      "subscriptionPlan.categoryId": categoryId,
    }).sort({ endDate: -1 });

    throw httpErrors.Forbidden(
      lapsed
        ? "Your plan for this category is no longer active. Please renew it to publish this ad."
        : "You need an active plan for this category before you can publish this ad.",
    );
  }

  let endDate;
  try {
    // Ad-count / limit rules for the plan the user actually holds.
    ({ endDate } = await accessChecker(userId, subscription));
  } catch (error) {
    throw httpErrors.Forbidden(error?.message);
  }

  return { subscription, endDate };
};

module.exports = {
  ACTIVE_STATUSES,
  INACTIVE_STATUSES,
  isWithinTerm,
  getActiveCategorySubscription,
  assertCanPublishInCategory,
  nowInSeconds,
  dayjs,
};
