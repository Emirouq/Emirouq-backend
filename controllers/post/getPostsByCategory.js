const Post = require("../../models/Post.model");
const { searchBy } = require("../../utils/socket/searchBy");

const getPostsByCategory = async (req, res, next) => {
  try {
    const { city } = req.query;

    const searchCriteria = searchBy({
      city,
    });
    const { categoryId } = req.params;
    const data = await Post.aggregate([
      {
        $match: {
          category: categoryId,
          ...searchCriteria,
          // Only live ads (same reason as featured ads).
          status: "active",
          isExpired: { $ne: true },
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
        $sort: {
          createdAt: -1,
        },
      },

      {
        $limit: 5,
      },
    ]);
    res.json({
      message: "Fetched successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getPostsByCategory;
