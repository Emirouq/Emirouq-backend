/**
 * One-off repair: gives every support ticket a unique ticket number.
 *
 * The old number generator gave every ticket "EMQ0001". This keeps the oldest
 * holder of each repeated number and renumbers the rest, oldest first, from
 * the same counter new tickets use.
 *
 *   node scripts/renumberSupportTickets.js           # dry run, changes nothing
 *   node scripts/renumberSupportTickets.js --apply   # writes the new numbers
 */
const mongoose = require("mongoose");
const { dbUrl } = require("../config/keys").host;
const SupportTicket = require("../models/Support.model");
const createTicketNumber = require("../services/createTicketNumber");

const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(dbUrl);
  const tickets = await SupportTicket.find({})
    .select("uuid ticketNumber createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const seen = new Set();
  const toRenumber = tickets.filter((ticket) => {
    if (!ticket.ticketNumber || seen.has(ticket.ticketNumber)) return true;
    seen.add(ticket.ticketNumber);
    return false;
  });

  console.log(`Tickets: ${tickets.length}, needing a new number: ${toRenumber.length}`);
  if (!apply) {
    console.log("Dry run. Nothing changed. Run again with --apply to fix.");
    return;
  }
  for (const ticket of toRenumber) {
    const ticketNumber = await createTicketNumber();
    await SupportTicket.updateOne({ uuid: ticket.uuid }, { $set: { ticketNumber } });
    console.log(`${ticket.ticketNumber || "(none)"} -> ${ticketNumber}`);
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
