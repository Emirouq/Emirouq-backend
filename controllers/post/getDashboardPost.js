const Post = require("../../models/Post.model");
const { SORT_MAP } = require("../../utils/numberUtils");
const { searchBy } = require("../../utils/socket/searchBy");

const getDashboardPost = async (req, res, next) => {
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
      city,
    } = req.query;

    // Build search filters
    const searchCriteria = searchBy({
      status,
      userId,
      priceRange,
      category,
      keyword,
      city,
    });

    const sortOption = SORT_MAP[sortBy] || { createdAt: -1 };

    const data = await Post.aggregate([
      {
        $match: {
          status: "active",
          $or: [{ isExpired: false }],
        },
      },
      {
        $sort: sortOption,
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
        $facet: {
          featured: [
            {
              $match: {
                ...searchCriteria,
                "featuredAd.isFeatured": true,
              },
            },
          ],
          byCategory: [
            {
              $match: searchCriteria,
            },
            {
              $group: {
                _id: "$category.uuid",
                categoryName: { $first: "$category.title" },
                posts: { $push: "$$ROOT" },
              },
            },
            {
              $set: {
                totalPosts: { $size: "$posts" },
              },
            },
            {
              $match: {
                totalPosts: { $gt: 0 },
              },
            },
          ],
        },
      },
    ]);

    const facet = data?.[0] || {};
    const featured = facet.featured || [];
    const byCategory = facet.byCategory || [];

    // ✅ Convert to array of { title, data }
    const sections = [];

    // Featured section
    if (featured.length > 0) {
      sections.push({ title: "Featured", data: featured });
    }

    // Category sections
    byCategory.forEach((cat) => {
      if (cat?.categoryName && cat?.posts?.length) {
        sections.push({
          categoryId: cat._id,
          title: cat.categoryName,
          data: cat.posts,
        });
      }
    });

    // Example of adding custom static sections (optional)
    // sections.push({ title: "Most Viewed", data: [] });

    res.json({
      message: "Fetched successfully",
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getDashboardPost;
