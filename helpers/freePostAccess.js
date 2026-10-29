const dayjs = require("dayjs");
const Post = require("../models/Post.model");
const FreePostSetting = require("../models/FreePostSetting.model");

/**
 * Answers "may this user publish a FREE ad in this category / sub-category?".
 *
 * Free ads are kept apart from subscription ads on purpose:
 *  - they are stamped `isFreePost: true`, `adType: "free"` and never carry a
 *    `subscriptionId`, so they do not use up a plan's ad quota
 *    (middlewares/access_checker.js counts paid ads of one subscription only)
 *    and the subscription-cancel webhook never expires them;
 *  - they never go near Stripe.
 */

const SETTING_KEY = "global";

/** Post statuses that count as a "live" free ad for the per-user limit. */
const LIVE_STATUSES = ["pending", "active", "paused", "requires_changes"];

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const getFreePostSetting = async () =>
  FreePostSetting.findOne({ key: SETTING_KEY }).lean();

/** Enabled and inside its validity window. */
const isCampaignLive = (setting, now = nowInSeconds()) => {
  if (!setting?.isEnabled) return false;
  if (setting.validFrom && now < setting.validFrom) return false;
  if (setting.validUntil && now > setting.validUntil) return false;
  return true;
};

/** Whether the setting covers this category / sub-category. */
const isCategoryCovered = (setting, categoryId, subCategoryId) => {
  if (!setting || !categoryId) return false;
  if (setting.scope === "all") return true;
  if (setting.categories?.includes(categoryId)) return true;
  return Boolean(subCategoryId && setting.subCategories?.includes(subCategoryId));
};

const countLiveFreePosts = (userId, excludePostId) =>
  Post.countDocuments({
    userId,
    isFreePost: true,
    isExpired: false,
    status: { $in: LIVE_STATUSES },
    ...(excludePostId && { uuid: { $ne: excludePostId } }),
  });

/**
 * @returns {Promise<{
 *   eligible: boolean,
 *   available: boolean,        // free posting applies to this category right now
 *   reason?: string,           // why not eligible, when `available` is true
 *   adExpiryDays?: number,
 *   validUntil?: number,
 *   remaining?: number|null,   // null means unlimited
 *   expirationDate?: number,   // unix seconds, only when eligible
 * }>}
 */
const getFreePostEligibility = async (
  userId,
  categoryId,
  subCategoryId,
  { excludePostId } = {}
) => {
  const setting = await getFreePostSetting();

  if (
    !isCampaignLive(setting) ||
    !isCategoryCovered(setting, categoryId, subCategoryId)
  ) {
    return { eligible: false, available: false };
  }

  const adExpiryDays = Math.max(1, Number(setting.adExpiryDays) || 1);
  const limit = Number(setting.maxActivePostsPerUser) || 0;
  const base = {
    available: true,
    adExpiryDays,
    validUntil: setting.validUntil || null,
  };

  let remaining = null;
  if (limit > 0) {
    const used = userId ? await countLiveFreePosts(userId, excludePostId) : 0;
    remaining = Math.max(0, limit - used);
    if (remaining === 0) {
      return {
        ...base,
        eligible: false,
        remaining,
        reason: `You can have only ${limit} free ad${
          limit === 1 ? "" : "s"
        } live at a time. Choose a plan to publish more.`,
      };
    }
  }

  return {
    ...base,
    eligible: true,
    remaining,
    expirationDate: dayjs().add(adExpiryDays, "day").unix(),
  };
};

module.exports = {
  LIVE_STATUSES,
  SETTING_KEY,
  getFreePostSetting,
  isCampaignLive,
  isCategoryCovered,
  getFreePostEligibility,
};
