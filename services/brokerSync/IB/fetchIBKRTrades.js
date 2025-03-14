const axios = require("axios");

const parseStringPromise = require("xml2js").parseStringPromise;
const fetchIBKRTrades = async ({ token, queryId }) => {
  const response = await axios.get(
    `https://www.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${token}&q=${queryId}&v=3`,
    {
      headers: {
        accept: "application/xml",
        responseType: "application/xml",
      },
    }
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const result = await parseStringPromise(response?.data?.trim());

  if (result?.FlexStatementResponse?.ErrorMessage) {
    console.log(
      "error message: ",
      result?.FlexStatementResponse?.ErrorMessage[0]
    );
    // return new Error(result?.FlexStatementResponse?.ErrorMessage[0]);
    throw new Error(result?.FlexStatementResponse?.ErrorMessage[0]);
  }

  const referenceCode = result?.FlexStatementResponse?.ReferenceCode?.[0];

  if (!referenceCode) {
    throw new Error(
      'Error while fetching trades from IBKR. "ReferenceCode" not found'
    );
  }
  const trades = await axios.get(
    `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement?t=${token}&q=${referenceCode}&v=3`
  );
  let tradeError;
  try {
    if (trades?.headers["content-type"].includes("text/xml")) {
      tradeError = await parseStringPromise(response.data.trim());
    } else if (trades?.headers["content-type"].includes("text/plain")) {
      tradeError = await parseStringPromise(response.data.trim());
    }
    // var data = trades.data?.trim().toString();
    // // const tradeError = new DOMParser().parseFromString(data);
    // const tradeError = await parseStringPromise(data);
    if (tradeError?.FlexStatementResponse?.ErrorMessage) {
      console.error(
        "error message: ",
        tradeError?.FlexStatementResponse?.ErrorMessage[0]
      );
      throw new Error(
        tradeError?.FlexStatementResponse?.ErrorMessage?.[0] ||
          "Error while fetching trades from IBKR"
      );
    }

    // send Email

    // Define a function called `csv_to_array` that converts CSV data to an array.
    const csv_to_array = (data, delimiter = ",", omitFirstRow = false) => {
      // Split the CSV data by newline characters, map each row to an array of values split by the delimiter.
      return data.split("\n").map((row) => row.split(delimiter));
    };

    // Convert the comma-separated text to an array.
    const csv_array = csv_to_array(trades.data);
    // agenda jobs time to time to fetch the data
    const formattedArray = csv_array
      .slice(1)
      .map((values) => {
        if (values?.[0]?.replace(/^"|"$/g, "") === "ClientAccountID")
          return null;

        return csv_array[0].reduce((obj, key, index) => {
          if (values?.[index] === undefined) return null;
          obj[key.replace(/^"|"$/g, "")] = values?.[index]?.replace(
            /^"|"$/g,
            ""
          );
          return obj;
        }, {});
      })
      ?.filter((j) => j);

    return formattedArray;
  } catch (error) {
    console.log("error while parsing trades data", error);
    throw error;
  }
};

module.exports = fetchIBKRTrades;
