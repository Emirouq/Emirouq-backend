const { NotificationEventType } = require("./eventTypes");

const withAd = (text, ctx) =>
  ctx.adTitle ? `${text} "${ctx.adTitle}".` : `${text}.`;

const notificationRules = {
  [NotificationEventType.MESSAGE_RECEIVED]: (ctx) => {
    // Chat notifications are merged per conversation; groupCount is how many
    // messages this one notification stands for.
    const count = Number(ctx.data?.groupCount) || 1;
    const from = ctx.actorName ? ` from ${ctx.actorName}` : "";
    const about = ctx.data?.adTitle ? ` about "${ctx.data.adTitle}"` : "";
    return {
      title: count > 1 ? `${count} New Messages` : "New Message",
      message:
        count > 1
          ? `You have ${count} new messages${from}${about}.`
          : `You received a new message${from}${about}.`,
      actions: { view: true, reply: true },
    };
  },
  [NotificationEventType.SELLER_REPLIED]: () => ({
    title: "Seller Replied",
    message: "The seller replied to your inquiry.",
    actions: { view: true, reply: true },
  }),
  [NotificationEventType.BUYER_INQUIRY]: () => ({
    title: "Buyer Inquiry",
    message: "A buyer is interested in your item.",
    actions: { view: true, reply: true },
  }),
  [NotificationEventType.MISSED_CHAT_REMINDER]: () => ({
    title: "Unread Messages",
    message: "You have unread messages waiting.",
    actions: { view: true, reply: true },
  }),
  [NotificationEventType.OFFER_RECEIVED]: () => ({
    title: "New Offer",
    message: "You received a new offer on your listing.",
    actions: { view: true, offer: true },
  }),
  [NotificationEventType.OFFER_COUNTERED]: () => ({
    title: "Offer Updated",
    message: "You received a counter offer.",
    actions: { view: true, offer: true },
  }),
  [NotificationEventType.OFFER_ACCEPTED]: () => ({
    title: "Offer Accepted",
    message: "Your offer was accepted.",
    actions: { view: true, pay: true },
  }),
  [NotificationEventType.OFFER_EXPIRING]: () => ({
    title: "Offer Expiring Soon",
    message: "An offer on your listing is expiring soon.",
    actions: { view: true, offer: true },
  }),
  [NotificationEventType.BUDGET_MATCH_FOUND]: () => ({
    title: "Budget Match Found",
    message: "A listing now matches your budget.",
    actions: { view: true },
  }),
  [NotificationEventType.AD_APPROVED]: (ctx) => ({
    title: "Ad Approved",
    message: ctx.adTitle
      ? `Your ad "${ctx.adTitle}" has been approved.`
      : "Your ad has been approved.",
    actions: { view: true },
  }),
  [NotificationEventType.AD_REJECTED]: (ctx) => ({
    title: "Ad Rejected",
    message:
      (ctx.adTitle
        ? `Your ad "${ctx.adTitle}" was rejected due to policy review.`
        : "Your ad was rejected due to policy review.") +
      (ctx.data?.rejectedReason ? ` Reason: ${ctx.data.rejectedReason}` : ""),
    actions: { view: true, edit: true },
  }),
  [NotificationEventType.AD_REQUIRES_CHANGES]: (ctx) => ({
    title: "Ad Requires Changes",
    message: withAd("Your ad needs a small update before publishing", ctx),
    actions: { view: true, edit: true },
  }),
  [NotificationEventType.AD_PUBLISHED]: () => ({
    title: "Ad Published",
    message: "Your ad is now live.",
    actions: { view: true },
  }),
  [NotificationEventType.AD_EXPIRED]: () => ({
    title: "Ad Expired",
    message: "Your ad has expired.",
    actions: { view: true },
  }),
  [NotificationEventType.AD_EXPIRING_SOON]: () => ({
    title: "Ad Expiring Soon",
    message: "Your ad will expire in 24 hours.",
    actions: { view: true },
  }),
  [NotificationEventType.AD_REMOVED_BY_ADMIN]: (ctx) => ({
    title: ctx.data?.status === "paused" ? "Ad Deactivated" : "Ad Removed",
    message:
      (ctx.data?.status === "paused"
        ? withAd("Your ad was deactivated after a policy review", ctx)
        : withAd("Your ad was removed after a policy review", ctx)) +
      (ctx.data?.reason ? ` Reason: ${ctx.data.reason}` : ""),
    actions: { view: true },
  }),
  [NotificationEventType.AD_BOOSTED]: () => ({
    title: "Ad Boosted",
    message: "Your boosted ad is now active.",
    actions: { view: true },
  }),
  [NotificationEventType.PAYMENT_SUCCESSFUL]: () => ({
    title: "Payment Successful",
    message: "Your payment was completed successfully.",
    actions: { view: true },
  }),
  [NotificationEventType.PAYMENT_FAILED]: () => ({
    title: "Payment Failed",
    message: "Payment failed. Please try again.",
    actions: { view: true, pay: true },
  }),
  [NotificationEventType.PACKAGE_ACTIVATED]: () => ({
    title: "Package Activated",
    message: "Your seller package is now active.",
    actions: { view: true },
  }),
  [NotificationEventType.BOOST_PACKAGE_EXPIRED]: () => ({
    title: "Boost Expiring Soon",
    message: "Your boost plan expires soon.",
    actions: { view: true },
  }),
  [NotificationEventType.RENEWAL_REMINDER]: () => ({
    title: "Renewal Reminder",
    message: "Your plan will expire soon. Renew to continue benefits.",
    actions: { view: true, pay: true },
  }),
  [NotificationEventType.REFUND_INITIATED]: () => ({
    title: "Refund Initiated",
    message: "Your refund has been initiated.",
    actions: { view: true },
  }),
  [NotificationEventType.REFUND_COMPLETED]: () => ({
    title: "Refund Completed",
    message: "Your refund has been completed.",
    actions: { view: true },
  }),
  [NotificationEventType.ACCOUNT_VERIFIED]: () => ({
    title: "Account Verified",
    message: "Your account has been verified.",
    actions: { view: true },
  }),
  [NotificationEventType.SELLER_VERIFICATION_APPROVED]: () => ({
    title: "Seller Verified",
    message: "Your seller verification has been approved.",
    actions: { view: true },
  }),
  [NotificationEventType.DOCUMENT_VERIFICATION_FAILED]: () => ({
    title: "Document Verification Failed",
    message: "Your documents need to be re-uploaded.",
    actions: { view: true, edit: true },
  }),
  [NotificationEventType.IDENTITY_CHECK_PENDING]: () => ({
    title: "Identity Check Pending",
    message: "Your identity verification is under review.",
    actions: { view: true },
  }),
  [NotificationEventType.SUSPICIOUS_ACTIVITY_ALERT]: () => ({
    title: "Suspicious Activity",
    message: "We noticed suspicious activity on your account.",
    actions: { view: true },
  }),
  [NotificationEventType.PASSWORD_CHANGED]: () => ({
    title: "Password Changed",
    message: "Your password was changed successfully.",
    actions: { view: true },
  }),
  [NotificationEventType.NEW_LOGIN_DETECTED]: () => ({
    title: "New Login Detected",
    message: "We noticed a login from a new device.",
    actions: { view: true },
  }),
  [NotificationEventType.SAVED_SEARCH_MATCH]: () => ({
    title: "New Saved Search Match",
    message: "A new listing matches your saved search.",
    actions: { view: true },
  }),
  [NotificationEventType.SAVED_ITEM_PRICE_DROPPED]: () => ({
    title: "Price Dropped",
    message: "Price dropped on an item you saved.",
    actions: { view: true },
  }),
  [NotificationEventType.FAVORITE_ITEM_UPDATED]: () => ({
    title: "Favorite Updated",
    message: "One of your favorite ads was updated.",
    actions: { view: true },
  }),
  [NotificationEventType.FAVORITE_ITEM_UNAVAILABLE]: () => ({
    title: "Favorite Unavailable",
    message: "A saved item is no longer available.",
    actions: { view: true },
  }),
  [NotificationEventType.REPORT_SUBMITTED]: (ctx) => {
    const ticket = ctx.data?.ticketNumber ? ` Ticket ${ctx.data.ticketNumber}.` : "";
    return ctx.data?.ticketType === "general"
      ? {
          title: "Support Ticket Created",
          message: `We received your request and will reply soon.${ticket}`,
          actions: { view: true },
        }
      : {
          title: "Report Submitted",
          message: `Thanks for your report. Our team will review it.${ticket}`,
          actions: { view: true },
        };
  },
  [NotificationEventType.REPORT_STATUS_UPDATED]: (ctx) => {
    const isGeneral = ctx.data?.ticketType === "general";
    const ticket = ctx.data?.ticketNumber ? ` ${ctx.data.ticketNumber}` : "";
    const status = ctx.data?.statusLabel;
    const response = ctx.data?.response ? ` ${ctx.data.response}` : "";
    return {
      title: isGeneral ? "Support Ticket Updated" : "Report Updated",
      message:
        (status
          ? `Your ${isGeneral ? "ticket" : "report"}${ticket} is now ${status}.`
          : `There is an update on your ${isGeneral ? "ticket" : "report"}${ticket}.`) +
        response,
      actions: { view: true },
    };
  },
  [NotificationEventType.ACCOUNT_WARNING]: () => ({
    title: "Account Warning",
    message: "A policy issue was detected on your account.",
    actions: { view: true },
  }),
  [NotificationEventType.POLICY_VIOLATION_NOTICE]: () => ({
    title: "Policy Notice",
    message: "A policy issue was detected on your listing.",
    actions: { view: true },
  }),
  [NotificationEventType.ACCOUNT_SUSPENDED]: () => ({
    title: "Account Restricted",
    message: "Your account has been temporarily restricted.",
    actions: { view: true },
  }),
  [NotificationEventType.ACCOUNT_RESTORED]: () => ({
    title: "Account Restored",
    message: "Your account has been restored.",
    actions: { view: true },
  }),
};

module.exports = { notificationRules };
