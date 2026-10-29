const Post = require("../../models/Post.model");
const { SORT_MAP } = require("../../utils/numberUtils");
const {
  mileageValueStage,
  yearValueStage,
  searchBy,
} = require("../../utils/socket/searchBy");

const getAdsPost = async (req, res, next) => {
  try {
    const {
      start,
      limit,
      status,
      userId,
      sortBy,
      priceRange,
      mileageRange,
      yearRange,
      category,
      subCategory,
      keyword,
      properties, // add this line
      city,
      adSource,
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
    // Admin filter: how the ad was paid for when it was published. This is
    // stamped on the ad, so it stays correct after a category changes
    // between Free and Paid.
    if (adSource === "free_category") {
      matchStage.isFreePost = true;
      matchStage.freeSource = "category";
    } else if (adSource === "free_trial") {
      matchStage.isFreePost = true;
      matchStage.freeSource = { $ne: "category" };
    } else if (adSource === "paid") {
      matchStage.adType = "paid";
    }
    if (propertyAnd.length) {
      // merge with any existing $and (e.g. keyword+city combo from searchBy)
      // instead of overwriting it
      matchStage.$and = [...(matchStage.$and || []), ...propertyAnd];
    }

    const sortOption = SORT_MAP[sortBy] || { createdAt: -1 }; // default to newest if sortBy is not provided
    const data = await Post.aggregate([
      mileageValueStage,
      yearValueStage,
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: sortOption,
      },
      {
        $facet: {
          data: [
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
          maxPrice: [
            {
              $group: {
                _id: null,
                value: { $max: "$price" },
              },
            },
          ],
          maxMileage: [
            {
              $group: {
                _id: null,
                value: { $max: "$mileageValue" },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0]?.data || [],
      count: data?.[0]?.count?.[0]?.count,
      maxPrice: data?.[0]?.maxPrice?.[0]?.value || 0,
      maxMileage: data?.[0]?.maxMileage?.[0]?.value || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAdsPost;
