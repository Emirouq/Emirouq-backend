const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const calendarTradeStats = async (req, res, next) => {
  const { accountIds, startDate, endDate, status, result, tradeType } =
    req.query;
  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
  });

  try {
    const trades = await Trade.aggregate([
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },
      // {
      //   $lookup: {
      //     from: "executions",
      //     localField: "executions",
      //     foreignField: "uuid",
      //     as: "execution",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$execution",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $addFields: {
          groupingDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$closeDate",
              timezone: "America/New_York",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$closeDate",
              timezone: "America/New_York",
            },
          },
          trades: {
            $addToSet: "$$ROOT",
          },
          // trades: {
          //   $addToSet: {
          //     symbol: "$symbol",
          //     side: "$side",
          //     result: "$result",
          //     tradeType: "$tradeType",
          //     status: "$status",
          //     currentPosition: "$currentPosition",
          //     executions: "$executions",
          //     netPnl: {
          //       $cond: {
          //         if: { $ne: ["$groupingDate", "$_id"] },
          //         then: { $sum: "$execution.commission" },
          //         else: {
          //           $cond: {
          //             if: { $eq: ["$calculationMethod", "fifo"] },
          //             then: "$fifo.netPnl",
          //             else: "$wa.netPnl",
          //           },
          //         },
          //       },
          //     },
          //     grossPnl: "$grossPnl",
          //     openDate: "$openDate",
          //     closeDate: "$closeDate",
          //     underlyingSymbol: "$underlyingSymbol",
          //     groupingDate: "$groupingDate",
          //   },
          // },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalProfit: 1,
          totalCommission: 1,
          totalVolume: 1,
          trades: 1,
          totalTrades: { $size: "$trades" },
          // tradeWinCount: {
          //   $size: {
          //     $filter: {
          //       input: "$trades",
          //       as: "trade",
          //       cond: {
          //         $or: [
          //           {
          //             $and: [
          //               { $eq: ["$$trade.calculationMethod", "fifo"] },
          //               { $gt: ["$$trade.fifo.netPnl", 0] },
          //             ],
          //           },
          //           {
          //             $and: [
          //               { $eq: ["$$trade.calculationMethod", "wa"] },
          //               { $gt: ["$$trade.wa.netPnl", 0] },
          //             ],
          //           },
          //         ],
          //       },
          //     },
          //   },
          // },
          // grossPnl: {
          //   $sum: {
          //     $map: {
          //       input: "$trades",
          //       as: "trade",
          //       in: {
          //         $cond: [
          //           { $eq: ["$$trade.calculationMethod", "fifo"] },
          //           "$$trade.fifo.grossPnl",
          //           "$$trade.wa.grossPnl",
          //         ],
          //       },
          //     },
          //   },
          // },
          // tradeLossCount: {
          //   $size: {
          //     $filter: {
          //       input: "$trades",
          //       as: "trade",
          //       cond: {
          //         $or: [
          //           {
          //             $and: [
          //               { $eq: ["$$trade.calculationMethod", "fifo"] },
          //               { $lt: ["$$trade.fifo.netPnl", 0] },
          //             ],
          //           },
          //           {
          //             $and: [
          //               { $eq: ["$$trade.calculationMethod", "wa"] },
          //               { $lt: ["$$trade.wa.netPnl", 0] },
          //             ],
          //           },
          //         ],
          //       },
          //     },
          //   },
          // },
          // tradesProfit: {
          //   $sum: {
          //     $map: {
          //       input: "$trades",
          //       as: "trade",
          //       in: {
          //         $cond: [
          //           { $eq: ["$$trade.calculationMethod", "fifo"] },
          //           {
          //             $cond: [
          //               { $gt: ["$$trade.fifo.netPnl", 0] },
          //               "$$trade.fifo.netPnl",
          //               0,
          //             ],
          //           },
          //           {
          //             $cond: [
          //               { $gt: ["$$trade.wa.netPnl", 0] },
          //               "$$trade.wa.netPnl",
          //               0,
          //             ],
          //           },
          //         ],
          //       },
          //     },
          //   },
          // },
          // tradesLoss: {
          //   $sum: {
          //     $map: {
          //       input: "$trades",
          //       as: "trade",
          //       in: {
          //         $cond: [
          //           { $eq: ["$$trade.calculationMethod", "fifo"] },
          //           {
          //             $cond: [
          //               { $lt: ["$$trade.fifo.netPnl", 0] },
          //               "$$trade.fifo.netPnl",
          //               0,
          //             ],
          //           },
          //           {
          //             $cond: [
          //               { $lt: ["$$trade.wa.netPnl", 0] },
          //               "$$trade.wa.netPnl",
          //               0,
          //             ],
          //           },
          //         ],
          //       },
          //     },
          //   },
          // },
        },
      },
      {
        $set: {
          tradeWinsPercent: {
            $multiply: [{ $divide: ["$tradeWinCount", "$totalTrades"] }, 100],
          },
          profitFactor: {
            $cond: [
              { $eq: ["$tradesLoss", 0] },
              0,
              { $divide: ["$tradesProfit", { $abs: "$tradesLoss" }] },
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = calendarTradeStats;
