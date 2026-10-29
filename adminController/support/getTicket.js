const httpErrors = require("http-errors");
const SupportTicket = require("../../models/Support.model");
const { ticketLookups } = require("./ticketLookups");
const { effectiveStatus } = require("../../helpers/supportTickets");

/** GET /admin/api/support/:id: one ticket with links, history and related reports. */
const getTicket = async (req, res, next) => {
  try {
    const [ticket] = await SupportTicket.aggregate([
      { $match: { uuid: req.params.id, isDeleted: { $ne: true } } },
      ...ticketLookups,
    ]);
    if (!ticket) throw httpErrors.NotFound("Ticket not found");

    // Other reports of the same ad or user help judge how serious it is.
    const relatedFilter =
      ticket.type === "ad_report" && ticket.postId
        ? { postId: ticket.postId, type: "ad_report" }
        : ticket.reportedUserId
          ? { reportedUserId: ticket.reportedUserId, type: { $ne: "general" } }
          : null;
    const related = relatedFilter
      ? await SupportTicket.find({
          ...relatedFilter,
          uuid: { $ne: ticket.uuid },
          isDeleted: { $ne: true },
        })
          .select("uuid ticketNumber reason status createdAt type")
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
      : [];

    res.json({
      message: "Ticket fetched successfully",
      data: {
        ...ticket,
        status: effectiveStatus(ticket),
        history: [...(ticket.history || [])].sort(
          (a, b) => new Date(a.at) - new Date(b.at)
        ),
        related: related.map((item) => ({ ...item, status: effectiveStatus(item) })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTicket;
