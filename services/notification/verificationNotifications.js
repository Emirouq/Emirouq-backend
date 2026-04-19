const Notification = require("../../models/Notification.model");
const { notificationService, NotificationEventType } = require("./index");

const VERIFICATION_EVENT_MAP = {
  account_verified: NotificationEventType.ACCOUNT_VERIFIED,
  seller_verification_approved: NotificationEventType.SELLER_VERIFICATION_APPROVED,
  identity_check_pending: NotificationEventType.IDENTITY_CHECK_PENDING,
  document_verification_failed: NotificationEventType.DOCUMENT_VERIFICATION_FAILED,
  verification_requires_action: NotificationEventType.DOCUMENT_VERIFICATION_FAILED,
  password_changed: NotificationEventType.PASSWORD_CHANGED,
};

const emitVerificationNotification = async (userOrId, eventType, extra = {}) => {
  const receiverId = typeof userOrId === "string" ? userOrId : userOrId?.uuid;
  const resolvedEventType = VERIFICATION_EVENT_MAP[eventType] || eventType;

  if (!receiverId || !resolvedEventType) {
    return;
  }

  const contextId = extra.contextId || `${resolvedEventType}:${receiverId}`;
  if (extra.dedupe !== false) {
    const alreadyExists = await Notification.exists({
      receiver: receiverId,
      eventType: resolvedEventType,
      contextId,
    });
    if (alreadyExists) {
      return;
    }
  }

  await notificationService.emit(
    resolvedEventType,
    {
      initiatorId: extra.initiatorId || "system",
      receiverId,
      initiatorRole: extra.initiatorRole || "system",
      receiverRole: "customer",
      contextId,
      contextType: extra.contextType || "verification",
      data: {
        reason: extra.reason,
        verificationStatus: extra.verificationStatus,
        ...extra.data,
      },
    },
    {
      push: extra.push,
    }
  );
};

module.exports = {
  VERIFICATION_EVENT_MAP,
  emitVerificationNotification,
  NotificationEventType,
};
