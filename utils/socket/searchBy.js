const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const searchBy = ({
  status,
  keyword,
  userId,
  priceRange,
  mileageRange,
  category,
  subCategory,
  city,
}) => {
  let searchCriteria = {
    // "location.city": {
    //   $exists: true,
    // },
  };
  if (status) {
    searchCriteria.status = status;
  }
  if (userId) {
    searchCriteria.userId = userId;
  }
  if (keyword) {
    searchCriteria["$or"] = [
      { title: { $regex: `${keyword.trim()}.*`, $options: "i" } },
      { "user.firstName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
      { "user.lastName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
      { "user.email": { $regex: `${keyword.trim()}.*`, $options: "i" } },
      { "user.userHandle": { $regex: `${keyword.trim()}.*`, $options: "i" } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ["$user.firstName", " ", "$user.lastName"] },
            regex: `${keyword.trim()}.*`,
            options: "i",
          },
        },
      },
    ];
  }
  if (priceRange) {
    const result = priceRange;
    if (!!+result[0] === true) {
      searchCriteria = {
        ...searchCriteria,
        price: {
          ...searchCriteria.price,
          $gte: parseFloat(result[0]),
        },
      };
    }
    if (!!+result[1] === true) {
      searchCriteria = {
        ...searchCriteria,
        price: {
          ...searchCriteria.price,
          $lte: parseFloat(result[1]),
        },
      };
    }
  }
  if (mileageRange) {
    const result = mileageRange;
    if (!!+result[0] === true) {
      searchCriteria = {
        ...searchCriteria,
        mileageValue: {
          ...searchCriteria.mileageValue,
          $gte: parseFloat(result[0]),
        },
      };
    }
    if (!!+result[1] === true) {
      searchCriteria = {
        ...searchCriteria,
        mileageValue: {
          ...searchCriteria.mileageValue,
          $lte: parseFloat(result[1]),
        },
      };
    }
  }
  if (category) {
    searchCriteria.category = category;
  }
  if (subCategory) {
    searchCriteria.subCategory = subCategory;
  }
  if (city) {
    searchCriteria = {
      ...searchCriteria,
      $or: [
        { "location.city": city },
        {
          "location.name": {
            $regex: `${city}.*`,
            $options: "i",
          },
        },
      ],
    };
  }

  return searchCriteria;
};
const mileageValueStage = {
  $addFields: {
    mileageValue: {
      $convert: {
        input: {
          $let: {
            vars: {
              mileageProperty: {
                $first: {
                  $filter: {
                    input: { $ifNull: ["$properties", []] },
                    as: "property",
                    cond: { $eq: ["$$property.attributeKey", "mileage"] },
                  },
                },
              },
            },
            in: "$$mileageProperty.selectedValue.value",
          },
        },
        to: "double",
        onError: null,
        onNull: null,
      },
    },
  },
};

module.exports = { searchBy, mileageValueStage };
