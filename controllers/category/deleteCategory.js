const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({ uuid: id });
    if (!category) {
      throw new Error("Category not found");
    }
    await SubCategory.deleteMany({ category: id });
    await Category.findOneAndDelete({ uuid: id });
    res.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteCategory;
