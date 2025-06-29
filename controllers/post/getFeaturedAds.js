const Post = require("../../models/Post.model");
const getFeaturedAds = async (req, res, next) => {
  try {
    const { start, limit } = req.query;

    const data = await Post.aggregate([
      {
        $match: {
          "featuredAd.isFeatured": true,
          status: "active",
          isExpired: false,
          subscriptionId: { $exists: true, $ne: null },
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
          "featuredAd.createdAt": -1,
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

module.exports = getFeaturedAds;
