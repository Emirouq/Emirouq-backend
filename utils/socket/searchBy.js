const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const searchBy = ({ status }) => {
  let searchCriteria = {};
  if (status) {
    searchCriteria.status = status;
  }

  return searchCriteria;
};
module.exports = { searchBy };
