const Post = require("../../models/Post.model");
const { searchBy } = require("../../utils/socket/searchBy");
const getAdsPost = async (req, res, next) => {
  try {
    const { start, limit, status, userId } = req.query;
    // const { uuid: userId } = req.user;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate
    const searchCriteria = searchBy({
      status,
      userId,
    });
    const data = await Post.aggregate([
      {
        $match: {
          ...searchCriteria,
          // $or: [
          //   {
          //     isExpired: false,
          //   },
          //   //for free users
          //   {
          //     expirationDate: { $gt: Date.now() },
          //   },
          // ],
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [
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

module.exports = getAdsPost;
