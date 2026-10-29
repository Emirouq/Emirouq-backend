const Joi = require("joi");
const httpErrors = require("http-errors");
const SupportTicket = require("../../models/Support.model");
const Post = require("../../models/Post.model");
const {
  OPEN_STATUSES,
  STATUS_LABELS,
  effectiveStatus,
  historyEntry,
} = require("../../helpers/supportTickets");
const {
  notifyTicketUpdated,
} = require("../../services/notification/supportNotifications");
const {
  emitAdStatusNotifications,
} = require("../../services/notification/adNotifications");
const {
  notifyFavoriteItemUnavailable,
} = require("../../services/notification/favoriteNotifications");
const { adminName } = require("./ticketLookups");

const schema = Joi.object({
  action: Joi.string().valid("deactivate", "remove", "restore").required(),
  // Shown to the seller with the deactivate / remove notification.
  reason: Joi.string().trim().max(1000).allow(""),
  // Also resolve every open report of this ad (this ticket included).
  resolveReports: Joi.boolean().default(false),
});

const ACTION_STATUS = { deactivate: "paused", remove: "removed" };
const ACTION_HISTORY = {
  deactivate: "ad_deactivated",
  remove: "ad_removed",
  restore: "ad_restored",
};

/**
 * POST /admin/api/support/:id/ad-action
 * Deactivates (hidden, can be restored), removes, or restores the reported ad.
 * The ad is never deleted, so the ticket keeps its evidence.
 */
const ticketAdAction = async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const ticket = await SupportTicket.findOne({ uuid: req.params.id });
    if (!ticket?.postId) throw httpErrors.BadRequest("This ticket has no ad");
    const post = await Post.findOne({ uuid: ticket.postId });
    if (!post) throw httpErrors.NotFound("Ad not found");

    const actor = {
      by: req.user.uuid,
      byRole: "admin",
      byName: adminName(req.user),
    };
    const fromStatus = post.status;
    let toStatus = ACTION_STATUS[value.action];

    if (value.action === "restore") {
      if (!["paused", "removed"].includes(fromStatus)) {
        throw httpErrors.BadRequest("Only a deactivated or removed ad can be restored");
      }
      // Back to the status the ad had before an admin took it down.
      const takedown = await SupportTicket.aggregate([
        { $match: { postId: post.uuid } },
        { $unwind: "$history" },
        { $match: { "history.action": { $in: ["ad_deactivated", "ad_removed"] } } },
        { $sort: { "history.at": -1 } },
        { $limit: 1 },
      ]);
      toStatus = takedown[0]?.history?.adStatusFrom || "active";
    } else if (fromStatus === toStatus) {
      throw httpErrors.BadRequest(`The ad is already ${toStatus}`);
    }

    post.status = toStatus;
    await post.save();

    ticket.history.push(
      historyEntry({
        ...actor,
        action: ACTION_HISTORY[value.action],
        adStatusFrom: fromStatus,
        adStatusTo: toStatus,
        note: value.reason || undefined,
        // The reporter learns the outcome through the ticket status instead.
        visibleToUser: false,
      })
    );
    await ticket.save();

    // Seller is told why; favourites learn the ad is gone.
    if (value.action !== "restore") {
      emitAdStatusNotifications(post, toStatus, {
        initiatorId: req.user.uuid,
        initiatorRole: "admin",
        data: { reason: value.reason, status: toStatus },
      }).catch((err) => console.error("Ad takedown notification failed:", err));
      notifyFavoriteItemUnavailable(post, {
        data: { reason: toStatus },
      }).catch(() => {});
    }

    let resolved = 0;
    if (value.resolveReports && value.action !== "restore") {
      const openReports = await SupportTicket.find({
        postId: post.uuid,
        type: "ad_report",
        isDeleted: { $ne: true },
        $or: [{ status: { $in: OPEN_STATUSES } }, { status: { $exists: false } }],
      });
      for (const report of openReports) {
        const previous = effectiveStatus(report);
        if (!OPEN_STATUSES.includes(previous)) continue;
        report.status = "resolved";
        report.resolvedAt = new Date();
        report.adminResponse =
          "Thanks for your report. We reviewed the ad and took action.";
        report.responded = true;
        report.history.push(
          historyEntry({
            ...actor,
            action: "status_changed",
            fromStatus: previous,
            toStatus: "resolved",
            note: `${STATUS_LABELS[previous]} → Resolved (ad ${toStatus})`,
          })
        );
        await report.save();
        notifyTicketUpdated(report, {
          response: report.adminResponse,
          adminId: req.user.uuid,
        });
        resolved += 1;
      }
    }

    res.json({
      message:
        value.action === "restore"
          ? `Ad restored to ${toStatus}`
          : `Ad ${toStatus}${resolved ? `, ${resolved} report(s) resolved` : ""}`,
      data: { postStatus: toStatus, resolvedReports: resolved },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = ticketAdAction;
