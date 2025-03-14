const dayjs = require("dayjs");
const minMax = require("dayjs/plugin/minMax");
dayjs.extend(minMax);

const minMaxDate = ({ dates }) => {
  // Ensure dates is an array and has elements
  if (!Array.isArray(dates) || dates.length === 0) {
    return { openDate: null, closeDate: null };
  }

  // Finding the minimum and maximum dates
  const sortedDates = dates.map((date) => dayjs(date)); // Convert dates to dayjs objects
  const openDate = dayjs.min(sortedDates).toDate(); // Convert back to JS Date object
  const closeDate = dayjs.max(sortedDates).toDate(); // Convert back to JS Date object

  return { openDate, closeDate };
};

module.exports = { minMaxDate };
