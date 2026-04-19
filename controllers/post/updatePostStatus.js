const Post = require("../../models/Post.model");
const httpErrors = require("http-errors");
const { sendEmail } = require("../../services/util/sendEmail");
const User = require("../../models/User.model");
const postRejection = require("../../services/templates/postRejection");
const {
  emitAdNotification,
  emitAdStatusNotifications,
  AD_STATUS_EVENT_MAP,
} = require("../../services/notification/adNotifications");
const { NotificationEventType } = require("../../services/notification");
const {
  notifySavedSearchMatches,
  notifyFavoriteItemUnavailable,
} = require("../../services/notification/favoriteNotifications");

const PERSISTED_POST_STATUSES = new Set([
  "pending",
  "draft",
  "active",
  "expired",
  "rejected",
  "requires_changes",
  "paused",
  "removed",
]);

const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason, notificationEvent } = req.body;

    const post = await Post.findOne({ uuid: id });
    if (!post) {
      throw httpErrors.NotFound("Post not found");
    }
    const user = await User.findOne({ uuid: post.userId });

    if (!AD_STATUS_EVENT_MAP[status] && !notificationEvent) {
      throw httpErrors.BadRequest("Unsupported ad status notification event");
    }

    if (status && PERSISTED_POST_STATUSES.has(status)) {
      post.status = status;
      post.rejectedReason =
        status === "rejected" && rejectedReason ? rejectedReason : undefined;
      await post.save();
    }

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
        }),
      );
    }

    if (notificationEvent) {
      await emitAdNotification(
        post,
        NotificationEventType[notificationEvent] || notificationEvent,
        {
          initiatorId: req.user?.uuid || "system",
          initiatorRole: req.user?.role === "Admin" ? "admin" : "customer",
          data: { rejectedReason },
        },
      );
    } else {
      await emitAdStatusNotifications(post, status, {
        initiatorId: req.user?.uuid || "system",
        initiatorRole: req.user?.role === "Admin" ? "admin" : "customer",
        data: { rejectedReason },
      });
    }

    if (["expired", "rejected", "paused", "removed"].includes(status)) {
      await notifyFavoriteItemUnavailable(post, {
        data: {
          reason: status,
        },
      });
    }
    if (status === "active") {
      await notifySavedSearchMatches(post);
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
