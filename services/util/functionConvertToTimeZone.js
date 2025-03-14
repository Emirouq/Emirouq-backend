const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

function convertToNewYorkTime(timestamp) {
  // Parse the input timestamp
  const date = dayjs(timestamp);

  // Format the date to match the input time and date, but with New York timezone offset
  const formattedDate = date
    .tz("America/New_York", true)
    .format("YYYY-MM-DDTHH:mm:ssZ");

  return formattedDate;
}

// Test cases
const input1 = "2024-05-22T17:00:30+05:30";
const input2 = "2022-04-12T17:40:30-10:30";

console.log(convertToNewYorkTime(input1)); // Expected output: '2024-05-22T17:00:30-04:00' or '2024-05-22T17:00:30-05:00' depending on daylight saving time
console.log(convertToNewYorkTime(input2)); // Expected output: '2022-04-12T17:40:30-04:00' or '2022-04-12T17:40:30-05:00' depending on daylight saving time
