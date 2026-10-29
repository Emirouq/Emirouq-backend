const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");

/** Ad statuses that count as live (visible or waiting for review). */
const LIVE_STATUSES = ["active", "pending"];

const resolveTarget = async (type, id) => {
  if (type === "category") {
    const doc = await Category.findOne({ uuid: id }).lean();
    return doc && { Model: Category, doc, postField: "category", scope: "category" };
  }
  if (type === "sub-category") {
    const doc = await SubCategory.findOne({ uuid: id }).lean();
    return (
      doc && {
        Model: SubCategory,
        doc,
        postField: "subCategory",
        scope: "subCategory",
      }
    );
  }
  return null;
};

module.exports = { LIVE_STATUSES, resolveTarget };
