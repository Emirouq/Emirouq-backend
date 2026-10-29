const Joi = require("joi");
const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");
const FreePostSetting = require("../../models/FreePostSetting.model");
const {
  SETTING_KEY,
  isCampaignLive,
} = require("../../helpers/freePostAccess");

const schema = Joi.object({
  isEnabled: Joi.boolean().required(),
  scope: Joi.string().valid("all", "selected").required(),
  categories: Joi.array().items(Joi.string()).unique().default([]),
  subCategories: Joi.array().items(Joi.string()).unique().default([]),
  // Unix timestamps in seconds; null clears the limit.
  validFrom: Joi.number().integer().min(0).allow(null).default(null),
  validUntil: Joi.number().integer().min(0).allow(null).default(null),
  adExpiryDays: Joi.number().integer().min(1).max(365).required(),
  // 0 means unlimited.
  maxActivePostsPerUser: Joi.number().integer().min(0).max(1000).required(),
});

/**
 * Saves the free-posting settings. Turning it off only stops NEW free ads;
 * free ads that are already live run until their own expiry date.
 */
const updateFreePostSettings = async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) throw httpErrors.BadRequest(error.message);

    if (
      value.validFrom &&
      value.validUntil &&
      value.validUntil <= value.validFrom
    ) {
      throw httpErrors.BadRequest(
        "Free posting end date must be after its start date"
      );
    }

    if (value.scope === "all") {
      value.categories = [];
      value.subCategories = [];
    } else if (
      value.isEnabled &&
      !value.categories.length &&
      !value.subCategories.length
    ) {
      throw httpErrors.BadRequest(
        "Select at least one category or sub-category for free posting"
      );
    }

    // Reject unknown ids instead of silently saving a rule that never matches.
    const [categoryCount, subCategoryCount] = await Promise.all([
      Category.countDocuments({ uuid: { $in: value.categories } }),
      SubCategory.countDocuments({ uuid: { $in: value.subCategories } }),
    ]);
    if (categoryCount !== value.categories.length) {
      throw httpErrors.BadRequest("One or more categories do not exist");
    }
    if (subCategoryCount !== value.subCategories.length) {
      throw httpErrors.BadRequest("One or more sub-categories do not exist");
    }

    const setting = await FreePostSetting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        $set: { ...value, updatedBy: req.user?.uuid },
        $setOnInsert: { key: SETTING_KEY },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.status(200).json({
      message: "Free posting settings updated successfully",
      data: { ...setting, isLive: isCampaignLive(setting) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateFreePostSettings;
