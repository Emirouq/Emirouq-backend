const SubCategory = require("../../../models/SubCategory.model");

const getSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { keyword, page = 0, limit = 10 } = req.query;
    let searchCriteria = {};
    if (keyword) {
      const regex = new RegExp(keyword, "i"); // 'i' for case-insensitive
      searchCriteria = {
        ...searchCriteria,
        title: { $regex: regex },
      };
    }
    const [data] = await SubCategory.aggregate([
      {
        $match: {
          category: id,
          ...searchCriteria,
        },
      },
      {
        $lookup: {
          from: "attributes",
          localField: "properties",
          foreignField: "uuid",
          as: "properties",
        },
      },
      //sort array
      {
        $project: {
          uuid: 1,
          title: 1,
          category: 1,
          isActive: 1,
          logo: 1,
          properties: {
            $sortArray: {
              input: "$properties",
              sortBy: { order: 1 },
            },
          },
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(page || 0),
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

    res.status(200).json({
      message: "SubCategory fetched successfully",
      data: data?.data || [],
      total: data?.count[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubCategory;
