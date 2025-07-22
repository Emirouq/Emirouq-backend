const Post = require("../../models/Post.model");
const { FEATURED_AD_SORT_MAP } = require("../../utils/numberUtils");
const { searchBy } = require("../../utils/socket/searchBy");
const getFeaturedAds = async (req, res, next) => {
  try {
    const { keyword, start, limit, sortBy, priceRange, category } = req.query;
    const sortOption = FEATURED_AD_SORT_MAP[sortBy] || { createdAt: -1 }; // default to newest if sortBy is not provided

    const searchCriteria = searchBy({
      priceRange,
      category,
      keyword,
    });
    const data = await Post.aggregate([
      {
        $match: {
          "featuredAd.isFeatured": true,
          ...searchCriteria,
          // status: "active",
          // isExpired: false,
          // subscriptionId: { $exists: true, $ne: null },
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

module.exports = getFeaturedAds;
