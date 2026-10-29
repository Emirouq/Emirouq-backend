const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Status as the user experiences it. Stored status can still say "active"
 * after the term ended, and both "canceled" and "cancelled" exist in data.
 * Returned as a $switch expression so lists can filter and count on it.
 */
const effectiveStatusExpr = (now = nowInSeconds()) => ({
  $switch: {
    branches: [
      {
        case: { $in: ["$status", ["canceled", "cancelled"]] },
        then: "cancelled",
      },
      { case: { $eq: ["$status", "inactive"] }, then: "inactive" },
      {
        case: {
          $and: [{ $gt: ["$endDate", 0] }, { $lte: ["$endDate", now] }],
        },
        then: "expired",
      },
      { case: { $gt: ["$cancel_at", 0] }, then: "ending" },
    ],
    default: "active",
  },
});

const ADMIN_USER_PROJECTION = {
  _id: 0,
  uuid: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  phoneNumber: 1,
  profileImage: 1,
  userHandle: 1,
  isActive: 1,
  customerId: 1,
  createdAt: 1,
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = {
  nowInSeconds,
  effectiveStatusExpr,
  ADMIN_USER_PROJECTION,
  escapeRegex,
};
