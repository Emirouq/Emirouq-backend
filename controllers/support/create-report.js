const httpErrors = require("http-errors");
const Joi = require("joi");
const { v4: uuid } = require("uuid");
const SupportTicket = require("../../models/Support.model");
const Post = require("../../models/Post.model");
const User = require("../../models/User.model");
const Conversation = require("../../models/Conversation.model");
const createTicketNumber = require("../../services/createTicketNumber");
const {
  OPEN_STATUSES,
  REPORT_REASONS,
  reasonLabel,
  historyEntry,
  toUserTicket,
} = require("../../helpers/supportTickets");
const {
  notifyTicketCreated,
} = require("../../services/notification/supportNotifications");

const MAX_REPORTS_PER_DAY = 10;

const schema = Joi.object({
  target: Joi.string().valid("ad", "user", "chat").required(),
  postId: Joi.string().when("target", { is: "ad", then: Joi.required() }),
  reportedUserId: Joi.string().when("target", {
    is: "user",
    then: Joi.required(),
  }),
  conversationId: Joi.string().when("target", {
    is: "chat",
    then: Joi.required(),
  }),
  reason: Joi.string().required(),
  comment: Joi.string().trim().allow("").max(1000).default(""),
});

const TYPE_BY_TARGET = {
  ad: "ad_report",
  user: "user_report",
  chat: "chat_report",
};

/**
 * POST /api/support/report
 * Reports an advertisement, a user or a chat. Creates a support ticket linked
 * to the ad, the seller / reported user and the reporting user.
 */
const createReport = async (req, res, next) => {
  try {
    const { uuid: reporterId, firstName, lastName } = req.user;
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const { target, reason, comment } = value;
    if (!REPORT_REASONS[target].some((item) => item.key === reason)) {
      throw httpErrors.BadRequest("Choose a reason from the list");
    }

    // Resolve what is being reported, and who it is about.
    let postId;
    let reportedUserId;
    let conversationId;
    let subject;

    if (target === "ad") {
      const post = await Post.findOne({ uuid: value.postId })
        .select("uuid userId title")
        .lean();
      if (!post) throw httpErrors.NotFound("Ad not found");
      if (post.userId === reporterId) {
        throw httpErrors.BadRequest("You cannot report your own ad");
      }
      postId = post.uuid;
      reportedUserId = post.userId;
      subject = `"${post.title || "Untitled ad"}"`;
    } else if (target === "user") {
      if (value.reportedUserId === reporterId) {
        throw httpErrors.BadRequest("You cannot report yourself");
      }
      const user = await User.findOne({ uuid: value.reportedUserId })
        .select("uuid firstName lastName")
        .lean();
      if (!user) throw httpErrors.NotFound("User not found");
      reportedUserId = user.uuid;
      subject = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "a user";
    } else {
      const conversation = await Conversation.findOne({
        uuid: value.conversationId,
      })
        .select("uuid users postId")
        .lean();
      if (!conversation?.users?.includes(reporterId)) {
        throw httpErrors.NotFound("Chat not found");
      }
      conversationId = conversation.uuid;
      postId = conversation.postId;
      reportedUserId = conversation.users.find((id) => id !== reporterId);
      subject = "a chat";
    }

    const type = TYPE_BY_TARGET[target];

    // One open report per reporter and target is enough.
    const existing = await SupportTicket.findOne({
      user: reporterId,
      type,
      status: { $in: OPEN_STATUSES },
      isDeleted: { $ne: true },
      ...(target === "ad" && { postId }),
      ...(target === "user" && { reportedUserId }),
      ...(target === "chat" && { conversationId }),
    })
      .select("ticketNumber")
      .lean();
    if (existing) {
      const conflict = httpErrors.Conflict(
        `You already reported this. Your ticket ${existing.ticketNumber} is being reviewed.`
      );
      conflict.ticketNumber = existing.ticketNumber;
      throw conflict;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await SupportTicket.countDocuments({
      user: reporterId,
      type: { $ne: "general" },
      createdAt: { $gte: since },
    });
    if (recentReports >= MAX_REPORTS_PER_DAY) {
      throw httpErrors.TooManyRequests(
        "You have sent many reports today. Please try again tomorrow."
      );
    }

    const label = reasonLabel(target, reason);
    const ticket = await SupportTicket.create({
      uuid: uuid(),
      ticketNumber: await createTicketNumber(),
      type,
      status: "open",
      user: reporterId,
      title: `Report: ${label} - ${subject}`.slice(0, 200),
      description: comment || label,
      reason,
      postId,
      reportedUserId,
      conversationId,
      history: [
        historyEntry({
          action: "created",
          by: reporterId,
          byRole: "customer",
          byName: `${firstName || ""} ${lastName || ""}`.trim(),
          toStatus: "open",
          note: label,
        }),
      ],
    });

    notifyTicketCreated(ticket);

    res.status(201).json({
      message: `Report submitted. Your ticket number is ${ticket.ticketNumber}.`,
      data: toUserTicket(ticket.toObject()),
    });
  } catch (error) {
    if (error?.ticketNumber) {
      return res.status(409).json({
        error: {
          status: 409,
          message: error.message,
          ticketNumber: error.ticketNumber,
        },
      });
    }
    next(error);
  }
};

module.exports = createReport;
