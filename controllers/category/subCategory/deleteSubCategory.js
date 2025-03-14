const SubCategory = require("../../../models/SubCategory.model");

const deleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findOne({ uuid: id });
    if (!subCategory) {
      throw new Error("SubCategory not found");
    }
    await SubCategory.findOneAndDelete({ uuid: id });
    res.json({
      message: "SubCategory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteSubCategory;
