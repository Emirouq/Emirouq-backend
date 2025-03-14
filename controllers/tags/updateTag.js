const httpErrors = require("http-errors");
const Tags = require("../../models/Tags.model");

const updateTag = async (req, res, next) => {
  try {
    const { description, name, categoryId } = req.body;
    const { id } = req.params;

    await Tags.findOneAndUpdate(
      { uuid: id },
      {
        name,
        categoryId,
        description
      },
      { new: true }
    );

    res.status(200).json({
      message: "Tags updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateTag;
