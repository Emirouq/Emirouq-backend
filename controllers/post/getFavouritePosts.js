const Post = require("../../models/Post.model");
const User = require("../../models/User.model");

const getFavouritePosts = async (req, res, next) => {
  try {
    const { start, limit } = req.query;
    const { uuid: userId } = req.user;

    const user = await User.findOne({ uuid: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favouriteIds = user?.favourites || [];
    const data = await Post.aggregate([
      {
        $match: {
          uuid: { $in: favouriteIds },
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
    console.log("data", data);
    res.json({
      message: "Fetched successfully",
      data: data?.[0].data,
      userId,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFavouritePosts;
