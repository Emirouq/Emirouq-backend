const University = require("../../models/University.model");

const getAllSections = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { keyword, section, start, limit } = req.query;
    if (keyword) {
      searchCriteria = {
        ...searchCriteria,
        tradeId: {
          $regex: keyword,
          $options: "i",
        },
      };
    }
    if (section) {
      searchCriteria = {
        ...searchCriteria,
        section: {
          $regex: section,
          $options: "i",
        },
      };
    }
    const data = await University.aggregate([
      {
        $match: {},
      },
      {
        $addFields: {
          videoCount: {
            $size: "$data",
          },
        },
      },
      // {
      //   $match: {
      //     videoCount: {
      //       $gt: 0,
      //     },
      //   },
      // },

      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: 1,
              },
            },
            {
              $skip: parseInt(start || 0),
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

    res.json({
      message: "Fetched successfully",
      // data: data,
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllSections;
