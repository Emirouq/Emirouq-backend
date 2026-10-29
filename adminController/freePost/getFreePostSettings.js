const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");
const {
  getFreePostSetting,
  isCampaignLive,
} = require("../../helpers/freePostAccess");

const DEFAULT_SETTING = {
  isEnabled: false,
  scope: "all",
  categories: [],
  subCategories: [],
  validFrom: null,
  validUntil: null,
  adExpiryDays: 7,
  maxActivePostsPerUser: 1,
};

/**
 * Free-posting settings plus every category with its sub-categories, so the
 * admin screen can render the category picker from one request.
 */
const getFreePostSettings = async (req, res, next) => {
  try {
    const [setting, categories, subCategories] = await Promise.all([
      getFreePostSetting(),
      Category.find({}).select("uuid title index").sort({ index: 1 }).lean(),
      SubCategory.find({})
        .select("uuid title category isActive")
        .sort({ title: 1 })
        .lean(),
    ]);

    const subCategoriesByCategory = subCategories.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push({
        uuid: item.uuid,
        title: item.title,
        isActive: item.isActive,
      });
      return acc;
    }, {});

    const data = { ...DEFAULT_SETTING, ...(setting || {}) };

    res.status(200).json({
      message: "Free posting settings fetched successfully",
      data: {
        ...data,
        isLive: isCampaignLive(data),
      },
      catalog: categories.map((category) => ({
        uuid: category.uuid,
        title: category.title,
        subCategories: subCategoriesByCategory[category.uuid] || [],
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFreePostSettings;
