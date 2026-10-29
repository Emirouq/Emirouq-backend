const Counter = require("../models/Counter.model");
const SupportTicket = require("../models/Support.model");

const COUNTER_KEY = "supportTicket";

/**
 * Next unique ticket number, e.g. "EMQ000017".
 *
 * Uses an atomic counter, so two tickets created at the same moment never
 * share a number. The old version read a field that did not exist and gave
 * every ticket "EMQ0001". On first use the counter starts after the tickets
 * that already exist.
 */
const createTicketNumber = async () => {
  if (!(await Counter.exists({ key: COUNTER_KEY }))) {
    const existing = await SupportTicket.countDocuments();
    await Counter.updateOne(
      { key: COUNTER_KEY },
      { $max: { seq: existing } },
      { upsert: true }
    );
  }
  const { seq } = await Counter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return `EMQ${String(seq).padStart(6, "0")}`;
};

module.exports = createTicketNumber;
