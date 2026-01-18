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
