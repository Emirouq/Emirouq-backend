const Post = require("../../models/Post.model");
const createHttpError = require("http-errors");

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({ uuid: id });

    if (!post?.uuid) {
      throw createHttpError(400, "Post not found!");
    }

    await Post.findOneAndDelete({ uuid: id });

    res.status(201).json({
      message: "Post deleted successfully!",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deletePost;
