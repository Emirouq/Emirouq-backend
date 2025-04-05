const Post = require("../../models/Post.model");
const { searchBy } = require("../../utils/socket/searchBy");
const getSinglePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate

    const [data] = await Post.aggregate([
      {
        $match: {
          uuid: id,
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
        $lookup: {
          from: "subCategories",
          localField: "subCategory",
          foreignField: "uuid",
          as: "subCategory",
        },
      },
      {
        $unwind: {
          path: "$subCategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "userId",
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
    ]);

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSinglePost;
