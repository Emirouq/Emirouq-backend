const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const searchBy = ({
  startDate,
  keyword,
  endDate,
  status,
  result,
  tradeType,
  tags,
  side,
  tagsFilter = false,
}) => {
  const tzOffset = new Date().getTimezoneOffset();
  let searchCriteria = {};
  if (keyword) {
    searchCriteria["$or"] = [
      {
        tradeId: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
      {
        symbol: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
      {
        underlyingSymbol: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
    ];
  }
  if (startDate && endDate && !tagsFilter) {
    searchCriteria = {
      ...searchCriteria,
      groupingDate: {
        $gte: dayjs(startDate)
          .utcOffset(tzOffset, true)
          .startOf("day")
          .toDate(),
        $lte: dayjs(endDate).utcOffset(tzOffset, true).endOf("day").toDate(),
      },
    };
  }
  if (startDate && endDate && tagsFilter) {
    searchCriteria = {
      ...searchCriteria,
      assignDate: {
        $gte: dayjs(startDate)
          .utcOffset(tzOffset, true)
          .startOf("day")
          .toDate(),
        $lte: dayjs(endDate).utcOffset(tzOffset, true).endOf("day").toDate(),
      },
    };
  }
  if (status) {
    searchCriteria = { ...searchCriteria, status };
  }
  if (side) {
    searchCriteria = { ...searchCriteria, side };
  }
  if (result) {
    searchCriteria = { ...searchCriteria, result };
  }
  if (tradeType) {
    searchCriteria = { ...searchCriteria, tradeType };
  }
  if (tags?.length) {
    searchCriteria = {
      ...searchCriteria,
      tags: { $all: tags?.split(",") },
    };
  }
  return searchCriteria;
};
module.exports = { searchBy };
