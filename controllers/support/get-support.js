const SupportTicket = require("../../models/Support.model");

const getSupport = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    let searchCriteria = {};
    const { start, limit, status } = req.query;

    if (status) {
      searchCriteria.status = status;
    }

    const data = await SupportTicket.aggregate([
      {
        $match: { user: userId },
      },
      {
        $match: searchCriteria,
      },
      {
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
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
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSupport;
