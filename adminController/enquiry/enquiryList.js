const Enquiry = require("../../models/Contact.model");

const enquiryList = async (req, res, next) => {
  try {
    const { keyword, start, limit } = req.query;

    const searchCriteria = {};

    if (keyword) {
      searchCriteria["$or"] = [
        { firstName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { lastName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { email: { $regex: `^${keyword.trim()}`, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: `^${keyword.trim()}`,
              options: "i",
            },
          },
        },
      ];
    }
    const data = await Enquiry.aggregate([
      {
        $match: searchCriteria,
      },
      {
        $sort: {
          createdAt: -1,
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

module.exports = enquiryList;
