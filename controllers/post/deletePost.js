const Post = require("../../models/Post.model");
const createHttpError = require("http-errors");
const { recordAudit } = require("../../helpers/auditLog");
const {
  notifyFavoriteItemUnavailable,
} = require("../../services/notification/favoriteNotifications");

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({ uuid: id });

    if (!post?.uuid) {
      throw createHttpError(400, "Post not found!");
    }

    // Owners delete their own ads; otherwise an admin needs posts.delete.
    // Any signed-in user could delete any ad before.
    const isOwner = post.userId === req.user?.uuid;
    const canModerate =
      req.user?.role === "Admin" && req.user?.permissions?.includes("posts.delete");
    if (!isOwner && !canModerate) {
      throw createHttpError(403, "You can only delete your own ads.");
    }

    await notifyFavoriteItemUnavailable(post, {
      data: {
        reason: "deleted",
      },
    });
    await Post.findOneAndDelete({ uuid: id });

    if (!isOwner) {
      recordAudit(req, {
        action: "posts.delete",
        entityType: "posts",
        entityId: id,
        entityName: post.title,
      });
    }

    res.status(201).json({
      message: "Post deleted successfully!",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deletePost;
