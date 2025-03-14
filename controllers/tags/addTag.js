const httpErrors = require("http-errors");
const Tags = require("../../models/Tags.model");
const { v4: uuid } = require("uuid");
const addTag = async (req, res, next) => {
  try {
    const { description, name, categoryId } = req.body;
    const { uuid: userId } = req.user;

    const isExist = await Tags.findOne({ name, userId });
    if (isExist) {
      throw httpErrors.Conflict("Tag already exist");
    }
    const tag = new Tags({
      uuid: uuid(),
      name,
      userId,
      categoryId,
      ...(description && { description }),
    });
    await tag.save();

    res.status(200).json({
      message: "Tag added successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addTag;
