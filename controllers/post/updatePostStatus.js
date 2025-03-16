const Post = require("../../models/Post.model");
const httpErrors = require("http-errors");

const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;

    const post = await Post.findOne({ uuid: id });
    if (!post) {
      throw httpErrors.NotFound("Post not found");
    }

    post.status = status;
    post.rejectedReason =
      status === "rejected" && rejectedReason ? rejectedReason : undefined;

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
