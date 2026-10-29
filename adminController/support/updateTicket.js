const Joi = require("joi");
const httpErrors = require("http-errors");
const SupportTicket = require("../../models/Support.model");
const Admin = require("../../models/Admin.model");
const {
  TICKET_STATUSES,
  STATUS_LABELS,
  effectiveStatus,
  historyEntry,
} = require("../../helpers/supportTickets");
const {
  notifyTicketUpdated,
} = require("../../services/notification/supportNotifications");
const { adminName } = require("./ticketLookups");

const schema = Joi.object({
  status: Joi.string().valid(...TICKET_STATUSES),
  // admin uuid, or null / "" to unassign
  assignedTo: Joi.string().allow(null, ""),
  // Reply the user sees (also sent as a notification).
  response: Joi.string().trim().max(2000).allow(""),
  // Internal note: kept in history, never shown to the user.
  note: Joi.string().trim().max(2000).allow(""),
}).or("status", "assignedTo", "response", "note");

/**
 * PATCH /admin/api/support/:id
 * Change status, assign, reply to the user and/or add an internal note.
 * Every change is written to the ticket history with who and when.
 */
const updateTicket = async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const ticket = await SupportTicket.findOne({
      uuid: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!ticket) throw httpErrors.NotFound("Ticket not found");

    const actor = {
      by: req.user.uuid,
      byRole: "admin",
      byName: adminName(req.user),
    };
    const currentStatus = effectiveStatus(ticket);
    let statusChanged = false;

    if (value.assignedTo !== undefined && value.assignedTo !== (ticket.assignedTo || "")) {
      let assigneeName = "";
      if (value.assignedTo) {
        const admin = await Admin.findOne({ uuid: value.assignedTo }).lean();
        if (!admin) throw httpErrors.BadRequest("Admin not found");
        assigneeName = adminName(admin);
      }
      ticket.assignedTo = value.assignedTo || undefined;
      ticket.assignedToName = assigneeName || undefined;
      ticket.history.push(
        historyEntry({
          ...actor,
          action: "assigned",
          note: assigneeName ? `Assigned to ${assigneeName}` : "Unassigned",
          visibleToUser: false,
        })
      );
      // Picking a ticket up moves it out of "Open".
      if (value.assignedTo && currentStatus === "open" && !value.status) {
        value.status = "in_progress";
      }
    }

    if (value.status && value.status !== currentStatus) {
      ticket.status = value.status;
      statusChanged = true;
      if (value.status === "resolved") ticket.resolvedAt = new Date();
      if (value.status === "closed") ticket.closedAt = new Date();
      ticket.history.push(
        historyEntry({
          ...actor,
          action: "status_changed",
          fromStatus: currentStatus,
          toStatus: value.status,
          note: `${STATUS_LABELS[currentStatus]} → ${STATUS_LABELS[value.status]}`,
        })
      );
    } else if (!ticket.status) {
      ticket.status = currentStatus; // store it for tickets from before
    }

    if (value.response) {
      ticket.adminResponse = value.response;
      ticket.responded = true;
      ticket.history.push(
        historyEntry({ ...actor, action: "responded", note: value.response })
      );
    }

    if (value.note) {
      ticket.history.push(
        historyEntry({
          ...actor,
          action: "note",
          note: value.note,
          visibleToUser: false,
        })
      );
    }

    await ticket.save();

    if (statusChanged || value.response) {
      notifyTicketUpdated(ticket, {
        response: value.response,
        adminId: req.user.uuid,
      });
    }

    res.json({ message: "Ticket updated", data: ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = updateTicket;
