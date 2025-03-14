const axios = require("axios");
const dayjs = require("dayjs");
// const fs = require("fs");
// const checkDuplicateRecords = require("./checkDuplicateRecords");
// const parseStringPromise = require("xml2js").parseStringPromise;

const fetchQuesTradeData = async ({
  accessToken,
  apiServer,
  quesTradeAccount,
  date,
}) => {
  const response = await axios.get(
    `${apiServer}v1/accounts/${quesTradeAccount}/executions?startTime=${dayjs(
      date
    ).format("YYYY-MM-DDTHH:mm:ss.SSSSSSZ")}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // // Define a function called `csv_to_array` that converts CSV data to an array.
  // const csv_to_array = (data, delimiter = ",", omitFirstRow = false) => {
  //   // Split the CSV data by newline characters, map each row to an array of values split by the delimiter.
  //   return data.split("\n").map((row) => row.split(delimiter));
  // };

  // // Convert the comma-separated text to an array.
  // const csv_array = csv_to_array(trades.data);
  // // agenda jobs time to time to fetch the data
  // const formattedArray = csv_array
  //   .slice(1)
  //   .map((values) => {
  //     return csv_array[0].reduce((obj, key, index) => {
  //       if (values?.[index] === undefined) return null;
  //       obj[key.replace(/^"|"$/g, "")] = values?.[index]?.replace(/^"|"$/g, "");
  //       return obj;
  //     }, {});
  //   })
  //   ?.filter((j) => j);

  // const groupedAndSorted = await new Promise((resolve) => {
  //   resolve(
  //     checkDuplicateRecords({
  //       data: formattedArray,
  //       importVia,
  //       brokerName,
  //       accountId: accountId,
  //     })
  //   );
  // });

  // return groupedAndSorted;
  return response.data;
};

module.exports = fetchQuesTradeData;
