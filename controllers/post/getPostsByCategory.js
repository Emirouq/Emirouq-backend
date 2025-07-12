const Post = require("../../models/Post.model");

const getPostsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const data = await Post.aggregate([
      {
        $match: {
          category: categoryId,
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
    console.log("data", data);
    res.json({
      message: "Fetched successfully",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getPostsByCategory;
