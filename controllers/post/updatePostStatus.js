const Post = require("../../models/Post.model");
const httpErrors = require("http-errors");
const { sendEmail } = require("../../services/util/sendEmail");
const User = require("../../models/User.model");
const postRejection = require("../../services/templates/postRejection");

const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;

    const post = await Post.findOne({ uuid: id });
    const user = await User.findOne({ uuid: post.userId });
    if (!post) {
      throw httpErrors.NotFound("Post not found");
    }

    post.status = status;
    post.rejectedReason =
      status === "rejected" && rejectedReason ? rejectedReason : undefined;
    await post.save();

    if (user.email && status === "rejected") {
      await sendEmail(
        [user.email],
        `Ad Rejected`,
        postRejection({
          name: `${user?.firstName} ${user?.lastName || ""}`,
          postTitle: post?.title,
          postContentSnippet: post?.description,
          rejectionReason: rejectedReason,
          guidelinesLink: "https://emirouq.ae/",
          postEditLink: "https://emirouq.ae/",
          supportLink: "https://emirouq.ae/",
        })
      );
    }

    res.status(200).json({
      message: "Post status updated successfully",
      post,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updatePostStatus;
