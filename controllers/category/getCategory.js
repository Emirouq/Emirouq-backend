const Category = require("../../models/Category.model");

const getCategory = async (req, res, next) => {
  try {
    const { id, keyword, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (id) {
      filter = { uuid: id };
    } else if (keyword) {
      filter = { title: { $regex: keyword, $options: "i" } };
    }

    const query = Category.find(filter).sort({ createdAt: -1 });

    if (!id) {
      query.skip((page - 1) * limit).limit(Number(limit));
    }

    const data = await query;

    res.status(200).json({
      message: "Category fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCategory;
