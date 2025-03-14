const Category = require("../../models/Category.model");
const groupCategory = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const data = await Category.aggregate([
      {
        $match: {
          userId,
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "uuid",
          foreignField: "categoryId",
          as: "tags",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    res.status(200).json({
      message: "Category fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = groupCategory;
