const { notificationService, NotificationEventType } = require("./index");
const { STATUS_LABELS } = require("../../helpers/supportTickets");

const basePayload = (ticket, extra = {}) => ({
  initiatorId: extra.initiatorId || "system",
  receiverId: ticket.user,
  initiatorRole: extra.initiatorRole || "system",
  receiverRole: "customer",
  contextId: ticket.uuid,
  contextType: "report",
  data: {
    ticketId: ticket.uuid,
    ticketNumber: ticket.ticketNumber,
    ticketType: ticket.type,
    status: ticket.status,
    statusLabel: STATUS_LABELS[ticket.status],
    postId: ticket.postId,
    ...extra.data,
  },
});

/** Tells the user their ticket or report was received (in-app only). */
const notifyTicketCreated = (ticket) =>
  notificationService
    .emit(NotificationEventType.REPORT_SUBMITTED, basePayload(ticket), {
      push: false,
    })
    .catch((error) => console.error("Ticket created notification failed:", error));

/** Tells the user about a status change or a reply (in-app and push). */
const notifyTicketUpdated = (ticket, { response, adminId } = {}) =>
  notificationService
    .emit(
      NotificationEventType.REPORT_STATUS_UPDATED,
      basePayload(ticket, {
        initiatorId: adminId,
        initiatorRole: "admin",
        data: { response },
      })
    )
    .catch((error) => console.error("Ticket update notification failed:", error));

module.exports = { notifyTicketCreated, notifyTicketUpdated };
