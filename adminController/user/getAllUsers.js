const User = require("../../models/User.model");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const getAllUsers = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword } = req.query;
    if (keyword) {
      searchCriteria = {
        ...searchCriteria,
        $or: [
          {
            name: {
              $regex: keyword,
              $options: "i",
            },
          },
          {
            email: {
              $regex: keyword,
              $options: "i",
            },
          },
        ],
      };
    }
    const data = await User.aggregate([
      {
        $match: {
          ...searchCriteria,
          role: "customer",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: +startIndex || 0 }, { $limit: +viewSize || 10 }],
          count: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0]?.data,
      totalDocs: data?.[0]?.count?.[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllUsers;
