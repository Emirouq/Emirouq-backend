const Post = require("../../models/Post.model");
const {
  mileageValueStage,
  yearValueStage,
  searchBy,
} = require("../../utils/socket/searchBy");

const getPostCount = async (req, res, next) => {
  try {
    const {
      status,
      userId,
      priceRange,
      mileageRange,
      yearRange,
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
      mileageRange,
      yearRange,
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
    let propertyAnd = [];
    if (properties) {
      // normalize into array
      const propertyValues = Array.isArray(properties)
        ? properties
        : properties.split(",");

      // every selected value must match some property on the post (AND across
      // filters), instead of matching if any property matches any value (OR)
      propertyAnd = propertyValues.map((v) => ({
        properties: {
          $elemMatch: {
            "selectedValue.value": new RegExp(`^${v.trim()}`, "i"),
          },
        },
      }));
    }

    const matchStage = { ...searchCriteria, ...search, isExpired: false };
    if (propertyAnd.length) {
      // merge with any existing $and (e.g. keyword+city combo from searchBy)
      // instead of overwriting it
      matchStage.$and = [...(matchStage.$and || []), ...propertyAnd];
    }

    const [data] = await Post.aggregate([
      mileageValueStage,
      yearValueStage,
      {
        $match: matchStage,
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
