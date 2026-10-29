const dayjs = require("dayjs");
const Category = require("../models/Category.model");
const SubCategory = require("../models/SubCategory.model");

/**
 * Whether a category / sub-category is a Free category.
 *
 * A free category covers all of its sub-categories. A sub-category can also be
 * free on its own inside a paid category. The sub-category's validity wins
 * when it is free itself; otherwise the category's applies.
 *
 * Read fresh on every publish, so an admin switch takes effect immediately
 * and needs no app update. Ads already published are never touched by it.
 *
 * @returns {Promise<{ isFree: boolean, validityDays?: number, source?: "subCategory"|"category" }>}
 */
const getFreeCategoryRule = async (categoryId, subCategoryId) => {
  if (!categoryId) return { isFree: false };

  const [category, subCategory] = await Promise.all([
    Category.findOne({ uuid: categoryId })
      .select("isFree freeAdValidityDays")
      .lean(),
    subCategoryId
      ? SubCategory.findOne({ uuid: subCategoryId, category: categoryId })
          .select("isFree freeAdValidityDays")
          .lean()
      : null,
  ]);

  if (subCategory?.isFree) {
    return {
      isFree: true,
      validityDays: Number(subCategory.freeAdValidityDays) || 30,
      source: "subCategory",
    };
  }
  if (category?.isFree) {
    return {
      isFree: true,
      validityDays: Number(category.freeAdValidityDays) || 30,
      source: "category",
    };
  }
  return { isFree: false };
};

const freeCategoryExpiry = (validityDays) =>
  dayjs().add(validityDays, "day").unix();

module.exports = { getFreeCategoryRule, freeCategoryExpiry };
