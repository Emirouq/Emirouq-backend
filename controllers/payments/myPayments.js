const Transaction = require("../../models/Transaction.model");

/** GET /api/payments/my: the user's payments with receipts and invoices. */
const myPayments = async (req, res, next) => {
  try {
    const { start, limit } = req.query;
    const filter = { userId: req.user.uuid };
    const [data, count] = await Promise.all([
      Transaction.find(filter)
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(parseInt(start || 0))
        .limit(Math.min(parseInt(limit || 20), 50))
        .select(
          "uuid type status amount currency planName postId paidAt createdAt " +
            "paymentMethod receiptUrl invoicePdf invoiceNumber refundedAmount failureMessage"
        )
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    res.json({ data, count });
  } catch (error) {
    next(error);
  }
};

module.exports = myPayments;
