const Post = require("../../models/Post.model");
const { SORT_MAP } = require("../../utils/numberUtils");
const { searchBy } = require("../../utils/socket/searchBy");

const getAdsPost = async (req, res, next) => {
  try {
    const {
      start,
      limit,
      status,
      userId,
      sortBy,
      priceRange,
      category,
      keyword,
    } = req.query;
    // const { uuid: userId } = req.user;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate
    const searchCriteria = searchBy({
      status,
      userId,
      priceRange,
      category,
      keyword,
    });
    const sortOption = SORT_MAP[sortBy] || { createdAt: -1 }; // default to newest if sortBy is not provided
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
        $sort: sortOption,
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
