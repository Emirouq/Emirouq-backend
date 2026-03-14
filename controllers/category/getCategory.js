const Category = require("../../models/Category.model");

const getCategory = async (req, res, next) => {
  try {
    const { id, keyword, page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    let filter = {};

    if (id) {
      filter = { uuid: id };
    } else if (keyword) {
      filter = { title: { $regex: keyword, $options: "i" } };
    }

    const query = Category.find(filter).sort({ createdAt: -1 });

    let pagination = null;

    if (!id) {
      const totalCount = await Category.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitNum);

      query.skip((pageNum - 1) * limitNum).limit(limitNum);

      pagination = {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      };
    }

    const data = await query;

    res.status(200).json({
      message: "Category fetched successfully",
      data,
      ...(pagination && { pagination }),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCategory;
