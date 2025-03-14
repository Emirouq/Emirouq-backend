const Executions = require("../../../models/Execution.model");

const dailySectionReports = async ({
  accountIds,
  searchCriteria,
  searchCriteria2,
}) => {
  const data = await Executions.aggregate([
    {
      $match: {
        accountId: { $in: accountIds.split(",") },
        ...searchCriteria2,
      },
    },
    {
      $set: {
        netPnl: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            { $subtract: ["$fifo.profits", "$commission"] },
            { $subtract: ["$wa.profits", "$commission"] },
          ],
        },
        grossPnl: {
          $cond: [
            { $eq: ["$calculationMethod", "fifo"] },
            "$fifo.profits",
            "$wa.profits",
          ],
        },
      },
    },
    {
      $group: {
        _id: "$tradeId",
        data: {
          $push: {
            netPnl: "$netPnl",
            grossPnl: "$grossPnl",
            quantity: "$quantity",
            side: "$side",
          },
        },
      },
    },
    {
      $lookup: {
        from: "trades",
        localField: "_id",
        foreignField: "uuid",
        as: "trade",
      },
    },
    {
      $unwind: {
        path: "$trade",
      },
    },
    {
      $match: searchCriteria,
    },

    {
      $project: {
        _id: 0,
        trade: {
          $mergeObjects: [
            "$trade",
            {
              netPnl: {
                $sum: {
                  $reduce: {
                    input: "$data",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.netPnl"] },
                  },
                },
              },
              grossPnl: {
                $sum: {
                  $reduce: {
                    input: "$data",
                    initialValue: 0,
                    in: { $add: ["$$value", "$$this.grossPnl"] },
                  },
                },
              },
              quantity: {
                $sum: {
                  $reduce: {
                    input: "$data",
                    initialValue: 0,
                    in: {
                      $abs: {
                        $add: {
                          $cond: [
                            { $eq: ["$$this.side", "buy"] },
                            "$$this.quantity",
                            { $multiply: ["$$this.quantity", -1] },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  ]);

  return data;
};

module.exports = dailySectionReports;
