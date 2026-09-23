const SubCategory = require("../../../models/SubCategory.model");

const getSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    // `page` is 1-based, matching getCategory.js. `start` is accepted as a raw
    // offset for older clients that send it (the mobile app does).
    const { keyword, page, start, limit = 10 } = req.query;
    const limitNum = Math.max(1, Number(limit) || 10);
    const pageNum = Math.max(1, Number(page) || 1);
    const skip =
      start !== undefined ? Math.max(0, Number(start) || 0) : (pageNum - 1) * limitNum;
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
          data: [{ $skip: skip }, { $limit: limitNum }],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const totalCount = data?.count?.[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      message: "SubCategory fetched successfully",
      data: data?.data || [],
      // `total` kept for existing clients; `pagination` matches getCategory.js
      total: totalCount,
      pagination: {
        totalCount,
        totalPages,
        currentPage: Math.floor(skip / limitNum) + 1,
        limit: limitNum,
        hasNextPage: skip + limitNum < totalCount,
        hasPrevPage: skip > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSubCategory;
