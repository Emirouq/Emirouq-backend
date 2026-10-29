const { v4: uuid } = require("uuid");

const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const OPEN_STATUSES = ["open", "in_progress"];

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const TYPE_LABELS = {
  general: "Support request",
  ad_report: "Ad report",
  user_report: "User report",
  chat_report: "Chat report",
};

/** Predefined reasons the app offers, per thing being reported. */
const REPORT_REASONS = {
  ad: [
    { key: "fraud", label: "Fraud or scam" },
    { key: "misleading", label: "Misleading information" },
    { key: "duplicate", label: "Duplicate ad" },
    { key: "inappropriate", label: "Inappropriate content" },
    { key: "prohibited", label: "Prohibited item" },
    { key: "wrong_category", label: "Wrong category" },
    { key: "unavailable", label: "Item sold or unavailable" },
    { key: "other", label: "Other" },
  ],
  user: [
    { key: "fraud", label: "Fraud or scam" },
    { key: "harassment", label: "Harassment or abuse" },
    { key: "spam", label: "Spam" },
    { key: "fake_profile", label: "Fake profile" },
    { key: "inappropriate", label: "Inappropriate content" },
    { key: "other", label: "Other" },
  ],
  chat: [
    { key: "harassment", label: "Harassment or abuse" },
    { key: "fraud", label: "Fraud or scam" },
    { key: "spam", label: "Spam" },
    { key: "inappropriate", label: "Inappropriate messages" },
    { key: "other", label: "Other" },
  ],
};

const reasonLabel = (target, key) =>
  REPORT_REASONS[target]?.find((reason) => reason.key === key)?.label || key;

/** Status for tickets created before `status` was stored. */
const effectiveStatus = (ticket) =>
  ticket?.status || (ticket?.responded ? "resolved" : "open");

const historyEntry = (entry) => ({
  uuid: uuid(),
  at: new Date(),
  visibleToUser: true,
  ...entry,
});

/** The ticket as the reporting user may see it: no internal notes. */
const toUserTicket = (ticket) => ({
  ...ticket,
  status: effectiveStatus(ticket),
  history: (ticket.history || [])
    .filter((entry) => entry.visibleToUser !== false)
    .map(({ by, ...entry }) => entry),
  assignedTo: undefined,
  assignedToName: undefined,
});

module.exports = {
  TICKET_STATUSES,
  OPEN_STATUSES,
  STATUS_LABELS,
  TYPE_LABELS,
  REPORT_REASONS,
  reasonLabel,
  effectiveStatus,
  historyEntry,
  toUserTicket,
};
