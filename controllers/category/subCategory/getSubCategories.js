const SubCategory = require("../../../models/SubCategory.model");
const httpErrors = require("http-errors");

const getSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: subCategoryId, keyword, page = 1, limit = 10 } = req.query;

    if (!id && !subCategoryId) {
      throw httpErrors.BadRequest("Category ID or SubCategory ID is required");
    }

    let data;

    if (subCategoryId) {
      data = await SubCategory.findOne({ uuid: subCategoryId });
      if (!data) {
        throw httpErrors.NotFound("SubCategory not found");
      }
    } else {
      const filter = keyword
        ? { title: { $regex: keyword, $options: "i" }, category: id }
        : { category: id };

      data = await SubCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    }

    res.status(200).json({
      message: "SubCategory fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubCategory;
