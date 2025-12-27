const SubCategory = require("../../../models/SubCategory.model");

const deleteSubCategory = async (req, res, next) => {
  try {
    const { subCategoryId } = req.params;

    const subCategory = await SubCategory.findOne({ uuid: subCategoryId });
    if (!subCategory) {
      throw new Error("SubCategory not found");
    }
    await SubCategory.findOneAndDelete({ uuid: subCategoryId });
    res.json({
      message: "SubCategory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteSubCategory;
