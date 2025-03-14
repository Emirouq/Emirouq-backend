const Tags = require("../../models/Tags.model");
const getAllTags = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;

    const data = await Tags.aggregate([
      {
        $match: {
          userId,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    res.status(200).json({
      message: "Tags fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllTags;
