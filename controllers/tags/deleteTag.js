const Tags = require("../../models/Tags.model");
const Trade = require("../../models/Trade.model");
const Category = require("../../models/Category.model");

const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tags = await Tags.findOne({ uuid: id });
    if (!tags) {
      throw new Error("Tag not found");
    }
    const totalTags = await Tags.countDocuments({
      categoryId: tags?.categoryId,
    });

    await Tags.findOneAndDelete({ uuid: id });
    await Trade.updateMany(
      { tags: id },
      {
        $pull: {
          tags: id,
          ...(totalTags === 1 && {
            categories: tags.categoryId,
          }),
        },
      }
    );

    res.json({
      message: "Tag deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteTag;
