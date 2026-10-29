const httpErrors = require("http-errors");
const Category = require("../models/Category.model");
const SubCategory = require("../models/SubCategory.model");

/**
 * Whether a category / sub-category accepts new ads. A disabled category
 * closes all of its sub-categories. Read fresh on every request, so an admin
 * switch applies immediately and needs no app update.
 *
 * @returns {Promise<{ open: boolean, message?: string }>}
 */
const getCategoryAvailability = async (categoryId, subCategoryId) => {
  if (!categoryId) return { open: true };
  const [category, subCategory] = await Promise.all([
    Category.findOne({ uuid: categoryId }).select("isActive title").lean(),
    subCategoryId
      ? SubCategory.findOne({ uuid: subCategoryId })
          .select("isActive title category")
          .lean()
      : null,
  ]);

  if (!category) return { open: false, message: "Category not found" };
  if (category.isActive === false) {
    return {
      open: false,
      message: `"${category.title}" is not accepting new ads right now.`,
    };
  }
  if (subCategoryId) {
    if (!subCategory || subCategory.category !== categoryId) {
      return { open: false, message: "Sub-category not found in this category" };
    }
    if (subCategory.isActive === false) {
      return {
        open: false,
        message: `"${subCategory.title}" is not accepting new ads right now.`,
      };
    }
  }
  return { open: true };
};

/** Throws 403 when the category or sub-category is disabled. */
const assertCategoryOpen = async (categoryId, subCategoryId) => {
  const { open, message } = await getCategoryAvailability(
    categoryId,
    subCategoryId
  );
  if (!open) throw httpErrors.Forbidden(message);
};

module.exports = { getCategoryAvailability, assertCategoryOpen };
