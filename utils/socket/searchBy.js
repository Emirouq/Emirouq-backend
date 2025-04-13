const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const searchBy = ({ status, keyword, userId }) => {
  let searchCriteria = {};
  if (status) {
    searchCriteria.status = status;
  }
  if (userId) {
    searchCriteria.userId = userId;
  }
  if (keyword) {
    searchCriteria["$or"] = [
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

  return searchCriteria;
};
module.exports = { searchBy };
