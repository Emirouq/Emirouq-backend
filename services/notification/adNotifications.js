const { notificationService, NotificationEventType } = require("./index");

const AD_STATUS_EVENT_MAP = {
  active: [
    NotificationEventType.AD_APPROVED,
    NotificationEventType.AD_PUBLISHED,
  ],
  rejected: [NotificationEventType.AD_REJECTED],
  requires_changes: [NotificationEventType.AD_REQUIRES_CHANGES],
  expired: [NotificationEventType.AD_EXPIRED],
  expiring_soon: [NotificationEventType.AD_EXPIRING_SOON],
  paused: [NotificationEventType.AD_REMOVED_BY_ADMIN],
  removed: [NotificationEventType.AD_REMOVED_BY_ADMIN],
  removed_by_admin: [NotificationEventType.AD_REMOVED_BY_ADMIN],
  boosted: [NotificationEventType.AD_BOOSTED],
};

const buildAdPayload = (post, extra = {}) => ({
  initiatorId: extra.initiatorId || "system",
  receiverId: post.userId,
  initiatorRole: extra.initiatorRole || "system",
  receiverRole: "customer",
  contextId: post.uuid,
  contextType: "ad",
  adTitle: post.title,
  data: {
    postId: post.uuid,
    adId: post.uuid,
    adTitle: post.title,
    status: post.status,
    rejectedReason: post.rejectedReason,
    ...extra.data,
  },
});

const emitAdNotification = async (post, eventType, extra = {}) => {
  if (!post?.userId || !eventType) {
    return;
  }

  await notificationService.emit(eventType, buildAdPayload(post, extra), {
    push: extra.push,
  });
};

const emitAdStatusNotifications = async (post, status, extra = {}) => {
  const events = AD_STATUS_EVENT_MAP[status] || [];
  await Promise.all(
    events.map((eventType) => emitAdNotification(post, eventType, extra))
  );
};

const notifyAdsExpiringSoon = async (posts, extra = {}) => {
  const list = Array.isArray(posts) ? posts : [posts];
  await Promise.all(
    list.map((post) =>
      emitAdNotification(post, NotificationEventType.AD_EXPIRING_SOON, extra)
    )
  );
};

module.exports = {
  AD_STATUS_EVENT_MAP,
  emitAdNotification,
  emitAdStatusNotifications,
  notifyAdsExpiringSoon,
};
