const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const searchBy = ({
  status,
  keyword,
  userId,
  priceRange,
  category,
  subCategory,
}) => {
  let searchCriteria = {};
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
    console.log(!!+result[0] === true, result[0], result[1]);
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
  if (category) {
    searchCriteria.category = category;
  }
  if (subCategory) {
    searchCriteria.subCategory = subCategory;
  }

  return searchCriteria;
};
module.exports = { searchBy };
