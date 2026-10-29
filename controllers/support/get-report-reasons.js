const { REPORT_REASONS } = require("../../helpers/supportTickets");

/** GET /api/support/report-reasons: the predefined reasons, per target. */
const getReportReasons = (req, res) => {
  res.json({ message: "Report reasons", data: REPORT_REASONS });
};

module.exports = getReportReasons;
