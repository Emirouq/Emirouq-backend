const SupportTicket = require("../../models/Support.model");
const { ticketLookups } = require("./ticketLookups");
const { TICKET_STATUSES } = require("../../helpers/supportTickets");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /admin/api/support
 * ?type=general|ad_report|user_report|chat_report|reports
 * &status=open|in_progress|resolved|closed &reason= &assignedTo=me|unassigned|<uuid>
 * &keyword= (ticket number, title, reporter) &postId= &start= &limit=
 */
const listTickets = async (req, res, next) => {
  try {
    const { type, status, reason, assignedTo, keyword, postId, start, limit } =
      req.query;

    const base = { isDeleted: { $ne: true } };
    if (type === "reports") base.type = { $ne: "general" };
    else if (type) base.type = type;
    if (reason) base.reason = reason;
    if (postId) base.postId = postId;
    if (assignedTo === "me") base.assignedTo = req.user.uuid;
    else if (assignedTo === "unassigned") base.assignedTo = { $in: [null, ""] };
    else if (assignedTo) base.assignedTo = assignedTo;

    // Tickets from before `status` existed count as open (or resolved if answered).
    const statusExpr = {
      $ifNull: ["$status", { $cond: ["$responded", "resolved", "open"] }],
    };

    const pipeline = [
      { $match: base },
      { $set: { status: statusExpr } },
      ...ticketLookups,
    ];
    if (keyword?.trim()) {
      const pattern = new RegExp(escapeRegex(keyword.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { ticketNumber: pattern },
            { title: pattern },
            { "reporter.email": pattern },
            { "reporter.firstName": pattern },
            { "reportedUser.firstName": pattern },
            { "post.title": pattern },
          ],
        },
      });
    }

    const [result] = await SupportTicket.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [
            ...(status ? [{ $match: { status } }] : []),
            { $sort: { createdAt: -1 } },
            { $skip: parseInt(start || 0) },
            { $limit: Math.min(parseInt(limit || 20), 100) },
            { $project: { history: 0, attachments: 0 } },
          ],
          count: [...(status ? [{ $match: { status } }] : []), { $count: "count" }],
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]);

    const statusCounts = TICKET_STATUSES.reduce((acc, key) => {
      acc[key] =
        result?.statusCounts?.find((entry) => entry._id === key)?.count || 0;
      return acc;
    }, {});

    res.json({
      message: "Tickets fetched successfully",
      data: result?.data || [],
      count: result?.count?.[0]?.count || 0,
      statusCounts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = listTickets;
