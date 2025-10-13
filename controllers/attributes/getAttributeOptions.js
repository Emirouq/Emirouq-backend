const AttributeOption = require("../../models/AttributeOption.model");

const getAttributeOptions = async (req, res, next) => {
  try {
    const { keyword, start, limit, dependsOn } = req.query;
    const { attributeId } = req.params;
    if (!attributeId) {
      return res.status(400).json({
        message: "Attribute id is required",
        success: false,
      });
    }

    const searchCriteria = {};

    if (keyword) {
      searchCriteria.value = { $regex: `^${keyword.trim()}`, $options: "i" };
    }
    const data = await AttributeOption.aggregate([
      {
        $match: {
          ...searchCriteria,
          attributeId,
          parentId: {
            $exists: dependsOn ? true : false,
            ...(dependsOn ? { $ne: null } : { $eq: null }),
          },
        },
      },
      {
        $sort: {
          parentValue: 1,
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

module.exports = getAttributeOptions;
