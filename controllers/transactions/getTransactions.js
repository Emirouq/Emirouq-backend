const Transaction = require("../../models/Transaction.model");

const getTransactions = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { uuid: userId } = req.user;
    const { keyword, start, limit } = req.query;
    if (keyword) {
      searchCriteria["$or"] = [
        {
          subscriptionId: {
            $regex: `^${keyword.trim()}`,
            $options: "i",
          },
        },
        {
          paymentIntentId: {
            $regex: `^${keyword.trim()}`,
            $options: "i",
          },
        },
      ];
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          userId,
          ...searchCriteria,
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $skip: parseInt(start || 0),
            },
            {
              $limit: parseInt(limit || 10),
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTransactions;
