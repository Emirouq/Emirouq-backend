const dayjs = require("dayjs");
const Transaction = require("../../models/Transaction.model");
const { escapeRegex } = require("./shared");

/**
 * GET /admin/api/subscriptions/transactions
 * ?status=succeeded|failed|refunded|partially_refunded &type=subscription|renewal|boost
 * &keyword= (user, invoice no., charge / payment-intent id) &from=&to= (YYYY-MM-DD)
 * &userId= &subscriptionId= &start= &limit=
 */
const listTransactions = async (req, res, next) => {
  try {
    const { status, type, keyword, from, to, userId, subscriptionId, start, limit } =
      req.query;
    const match = {
      ...(status && { status }),
      ...(type && { type }),
      ...(userId && { userId }),
      ...(subscriptionId && { subscriptionId }),
    };
    if (from || to) {
      match.paidAt = {
        ...(from && { $gte: dayjs(from).startOf("day").toDate() }),
        ...(to && { $lte: dayjs(to).endOf("day").toDate() }),
      };
    }
    if (keyword?.trim()) {
      const pattern = new RegExp(escapeRegex(keyword.trim()), "i");
      match.$or = [
        { "user.firstName": pattern },
        { "user.lastName": pattern },
        { "user.email": pattern },
        { invoiceNumber: pattern },
        { charge: pattern },
        { paymentIntentId: pattern },
        { uuid: pattern },
      ];
    }

    const [data, count, totals] = await Promise.all([
      Transaction.find(match)
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(parseInt(start || 0))
        .limit(Math.min(parseInt(limit || 20), 100))
        .select("-outcome -discount")
        .lean(),
      Transaction.countDocuments(match),
      Transaction.aggregate([
        { $match: { ...match, status: { $in: ["succeeded", "partially_refunded"] } } },
        {
          $group: {
            _id: null,
            amount: { $sum: { $subtract: ["$amount", { $ifNull: ["$refundedAmount", 0] }] } },
          },
        },
      ]),
    ]);

    res.json({
      message: "Transactions",
      data,
      count,
      netAmount: totals[0]?.amount || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = listTransactions;
