const Post = require("../../models/Post.model");
const httpErrors = require("http-errors");

const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accepted, reason } = req.body;

    if (typeof accepted !== "boolean") {
      throw httpErrors.BadRequest(
        "Accepted field is required and must be a boolean"
      );
    }

    const post = await Post.findOne({ uuid: id });
    if (!post) {
      throw httpErrors.NotFound("Post not found");
    }

    post.accepted = accepted;
    post.reason = !accepted && reason ? reason : undefined;

    await post.save();

    res.status(200).json({
      message: "Post status updated successfully",
      post,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updatePostStatus;
