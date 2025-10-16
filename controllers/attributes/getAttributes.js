const Attribute = require("../../models/Attribute.model");

const getAttributes = async (req, res, next) => {
  try {
    const { keyword, start, limit } = req.query;
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Sub category id is required",
        success: false,
      });
    }
    const searchCriteria = {};

    if (keyword) {
      searchCriteria.label = { $regex: `^${keyword.trim()}`, $options: "i" };
    }
    const [data] = await Attribute.aggregate([
      {
        $match: {
          ...searchCriteria,
          $or: [{ subCategory: id }],
        },
      },
      {
        $sort: {
          label: 1,
        },
      },

      {
        $facet: {
          data: [{ $skip: +start || 0 }, { $limit: +limit || 10 }],
          count: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: data?.count[0]?.total || 0,
      data: data?.data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = getAttributes;
