const dayjs = require("dayjs");
const User = require("../../models/User.model");

const getAllUsers = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword, status, isActive } = req.query;
    const { role } = req.user;
    console.log(11, role);
    if (role !== "Admin") {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    if (keyword) {
      searchCriteria["$or"] = [
        { firstName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { lastName: { $regex: `^${keyword.trim()}`, $options: "i" } },
        { userHandle: { $regex: `^${keyword.trim()}`, $options: "i" } },
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
    if (isActive) {
      searchCriteria = {
        ...searchCriteria,
        isActive: isActive === "true" ? true : false,
      };
    }

    const data = await User.aggregate([
      {
        $match: {
          role: "customer",
        },
      },

      {
        $match: searchCriteria,
      },
      {
        $facet: {
          data: [
            {
              $sort: {
                createdAt: -1,
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
      data: data?.[0].data,
      count: data?.[0]?.count?.[0]?.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllUsers;
