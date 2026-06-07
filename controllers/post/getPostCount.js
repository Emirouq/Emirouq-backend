const Post = require("../../models/Post.model");
const { SORT_MAP } = require("../../utils/numberUtils");
const { searchBy } = require("../../utils/socket/searchBy");

const getPostCount = async (req, res, next) => {
  try {
    const {
      status,
      userId,
      priceRange,
      category,
      subCategory,
      keyword,
      properties, // add this line
      city,
    } = req.query;
    // const { uuid: userId } = req.user;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate
    const searchCriteria = searchBy({
      status,
      userId,
      priceRange,
      category,
      subCategory,
      keyword,
      city,
    });
    let search = {};
    if (keyword) {
      search.title = {
        $regex: `${keyword.trim()}.*`,
        $options: "i",
      };
    }
    // 🧩 handle multiple property filters
    let propertyFilter = {};
    if (properties) {
      // normalize into array
      const propertyValues = Array.isArray(properties)
        ? properties
        : properties.split(",");

      propertyFilter["properties.selectedValue.value"] = {
        $in: propertyValues.map((v) => new RegExp(`^${v.trim()}`, "i")),
      };
    }

    const [data] = await Post.aggregate([
      {
        $match: {
          ...searchCriteria,
          ...search,
          ...propertyFilter,
          $or: [
            {
              isExpired: false,
            },
          ],
        },
      },
      {
        $count: "count",
      },
    ]);

    res.json(data?.count);
  } catch (error) {
    next(error);
  }
};

module.exports = getPostCount;
