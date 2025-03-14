const Transaction = require("../../models/Transaction.model");

const getTransactions = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword, status, userId } = req.query;

    if (keyword) {
      searchCriteria["$or"] = [
        { "user.firstName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.lastName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.email": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.userHandle": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { invoiceNumber: { $regex: `${keyword.trim()}.*`, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              regex: `${keyword.trim()}.*`,
              options: "i",
            },
          },
        },
      ];
    }
    if (status) {
      searchCriteria.status = status;
    }
    if (userId) {
      searchCriteria.userId = userId;
    }

    const data = await Transaction.aggregate([
      {
        $match: searchCriteria,
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
