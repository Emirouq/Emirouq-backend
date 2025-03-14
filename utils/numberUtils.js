// const util = require("util");
const _ = require("lodash");
const round = (num) => {
  const data = _.round(num, 6);
  if (isNaN(data)) return 0;
  return data;
};

module.exports = { round };
