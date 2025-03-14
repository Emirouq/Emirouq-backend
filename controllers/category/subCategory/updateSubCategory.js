const httpErrors = require("http-errors");
const SubCategory = require("../../../models/SubCategory.model");
const { v4: uuid } = require("uuid");

const updateSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw httpErrors.BadRequest("SubCategory ID is required");
    }

    const { title, properties } = req.body;
    let updateData = {};

    if (title) updateData.title = title;
    if (properties) updateData.properties = properties;

    const updatedSubCategory = await SubCategory.findOneAndUpdate(
      { uuid: id },
      updateData,
      { new: true }
    );

    if (!updatedSubCategory) {
      throw httpErrors.NotFound("SubCategory not found");
    }

    res.status(200).json({
      message: "SubCategory updated successfully",
      data: updatedSubCategory,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateSubCategory;
