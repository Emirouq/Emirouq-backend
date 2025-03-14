const Tags = require("../../models/Tags.model");
const getTags = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { categoryId } = req.params;

    const data = await Tags.aggregate([
      {
        $match: {
          userId,
          categoryId,
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

module.exports = getTags;
