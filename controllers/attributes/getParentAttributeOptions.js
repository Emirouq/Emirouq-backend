const AttributeOption = require("../../models/AttributeOption.model");

const getParentAttributeOptions = async (req, res, next) => {
  try {
    const { keyword, start, limit } = req.query;
    const { parentId } = req.params;
    if (!parentId) {
      return res.status(400).json({
        message: "Attribute id is required",
        success: false,
      });
    }

    const searchCriteria = {};

    if (keyword) {
      searchCriteria.value = { $regex: `^${keyword.trim()}.*`, $options: "i" };
    }
    const data = await AttributeOption.aggregate([
      {
        $match: {
          ...searchCriteria,
          parentId,
        },
      },
      {
        $sort: {
          value: 1,
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
      message: "Detail fetch successfully.",
      success: true,
      count: data[0]?.count[0]?.total || 0,
      data: data[0]?.data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = getParentAttributeOptions;
