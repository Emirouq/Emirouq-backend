const Trade = require("../../models/Trade.model");
const { searchBy } = require("../../utils/socket/searchBy");

const tagsStats = async (req, res, next) => {
  const { accountIds, status, result, tradeType, startDate, endDate } =
    req.query;
  const searchCriteria = searchBy({
    status,
    result,
    tradeType,
    startDate,
    endDate,
  });

  try {
    const trades = await Trade.aggregate([
      {
        $set: {
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          netPnl: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              "$fifo.netPnl",
              "$wa.netPnl",
            ],
          },
        },
      },
      {
        $set: {
          breakEven: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $set: {
          breakEven: {
            $cond: [
              {
                $or: [
                  { $eq: ["$breakEven", true] },
                  {
                    $and: [
                      { $eq: ["$status", "closed"] },
                      { $eq: ["$netPnl", 0] },
                    ],
                  },
                ],
              },
              true, // Add 1 if the condition is true
              false, // Add 0 if the condition is false
            ],
          },
        },
      },
      {
        $set: {
          result: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: "breakEven",
              else: "$result",
            },
          },
        },
      },
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          categories: { $exists: true, $ne: [] },
          ...searchCriteria,
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "uuid",
          as: "joinedTags",
        },
      },
      {
        $unwind: {
          path: "$joinedTags",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $addFields: {
      //     effectiveTagAssign: {
      //       $ifNull: [{ $objectToArray: "$tagAssign" }, []],
      //     },
      //   },
      // },
      // {
      //   $addFields: {
      //     finalTagAssign: {
      //       $map: {
      //         input: "$tags", // Use the 'tags' array from the Trade document
      //         as: "tagUuid",
      //         in: {
      //           $let: {
      //             vars: {
      //               foundTag: {
      //                 $arrayElemAt: [
      //                   {
      //                     $filter: {
      //                       input: "$effectiveTagAssign",
      //                       as: "item",
      //                       cond: { $eq: ["$$item.k", "$$tagUuid"] },
      //                     },
      //                   },
      //                   0,
      //                 ],
      //               },
      //             },
      //             in: {
      //               k: "$$tagUuid",
      //               v: {
      //                 $ifNull: [
      //                   "$$foundTag.v", // Use existing assignDate if found
      //                   { assignDate: "$closeDate" }, // Otherwise, use closeDate
      //                 ],
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$finalTagAssign", // Unwind the newly created finalTagAssign
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $addFields: {
      //     assignDate: "$finalTagAssign.v.assignDate", // Assign the correct assignDate
      //   },
      // },

      {
        $group: {
          _id: "$joinedTags.uuid",
          trades: { $sum: 1 },
          categoryId: { $first: "$joinedTags.categoryId" },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          tags: {
            $addToSet: {
              tag: "$_id",
              trades: "$trades",
            },
          },
        },
      },
      {
        $sort: {
          "tags.trades": -1,
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

module.exports = tagsStats;
