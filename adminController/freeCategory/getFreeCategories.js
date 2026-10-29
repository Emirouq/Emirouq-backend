const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");

/** Every category with its sub-categories and their Free/Paid settings. */
const getFreeCategories = async (req, res, next) => {
  try {
    const [categories, subCategories] = await Promise.all([
      Category.find({})
        .select("uuid title logo index isFree freeAdValidityDays")
        .sort({ index: 1 })
        .lean(),
      SubCategory.find({})
        .select("uuid title category isActive isFree freeAdValidityDays")
        .sort({ title: 1 })
        .lean(),
    ]);

    const byCategory = subCategories.reduce((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push({
        uuid: item.uuid,
        title: item.title,
        isActive: item.isActive,
        isFree: !!item.isFree,
        freeAdValidityDays: item.freeAdValidityDays || 30,
      });
      return acc;
    }, {});

    res.json({
      message: "Free categories fetched successfully",
      data: categories.map((category) => ({
        uuid: category.uuid,
        title: category.title,
        logo: category.logo,
        isFree: !!category.isFree,
        freeAdValidityDays: category.freeAdValidityDays || 30,
        subCategories: byCategory[category.uuid] || [],
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFreeCategories;
