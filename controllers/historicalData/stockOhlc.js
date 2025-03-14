const axios = require("axios");
const { apiKey } = require("../../config/keys").twelvedata;
const { apiKey: marketStackApiKey } = require("../../config/keys").marketStack;
const { DateTime } = require("luxon");
const getCorrectSymbol = require("../../utils/ohlc/symbolProcessing");

// Function to parse interval string to duration
const parseInterval = (intervalStr) => {
  const match = intervalStr.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) {
    throw new Error(`Invalid interval format: ${intervalStr}`);
  }
  const amount = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "min":
      return { minutes: amount };
    case "h":
      return { hours: amount };
    case "day":
      return { days: amount };
    default:
      throw new Error(`Unsupported interval unit: ${unit}`);
  }
};

// Function to get date format based on interval
const getDateFormatForInterval = (interval) => {
  if (interval === "1day" || interval === "1week" || interval === "1month") {
    return "yyyy-MM-dd";
  } else {
    return "yyyy-MM-dd HH:mm:ss";
  }
};

// Market hours constants
const MARKET_OPEN_TIME = { hour: 9, minute: 30 };
const MARKET_CLOSE_TIME = { hour: 16, minute: 0 };

const OUTPUT_SIZE_LIMIT = 5000;

// Function to check if a datetime is within market hours
const isWithinMarketHours = (datetime) => {
  const dayOfWeek = datetime.weekday; // 1 = Monday, 7 = Sunday

  // Market is closed on weekends
  if (dayOfWeek === 6 || dayOfWeek === 7) {
    return false;
  }

  const marketOpen = datetime.set(MARKET_OPEN_TIME);
  const marketClose = datetime.set(MARKET_CLOSE_TIME);

  return datetime >= marketOpen && datetime <= marketClose;
};

// Function to adjust datetime to the previous market close time
const adjustToPreviousMarketClose = (datetime) => {
  let adjustedDateTime = datetime;

  while (true) {
    // Move back one day
    adjustedDateTime = adjustedDateTime
      .minus({ days: 1 })
      .set(MARKET_CLOSE_TIME);

    const dayOfWeek = adjustedDateTime.weekday;

    // Skip weekends
    if (dayOfWeek === 6 || dayOfWeek === 7) {
      continue;
    }

    return adjustedDateTime;
  }
};

// Helper function to fetch data recursively and handle pagination
const fetchAllData = async (
  initialUrl,
  apiKey,
  startDate,
  endDate,
  symbol,
  interval
) => {
  let allResults = [];

  const parseFormat = "yyyy-MM-dd HH:mm:ss"; // Format of input dates from frontend
  const dateFormat = getDateFormatForInterval(interval); // Format required by API based on interval

  // Parse the dates using parseFormat with the correct timezone
  let currentEndDate = DateTime.fromFormat(endDate, parseFormat, {
    zone: "America/New_York",
  });
  const startDateTime = DateTime.fromFormat(startDate, parseFormat, {
    zone: "America/New_York",
  });
  const intervalDuration = parseInterval(interval);

  try {
    while (true) {
      // For each iteration, we use the same startDateTime
      let currentStartDate = startDateTime;

      // Construct the URL for fetching data within a specific date range
      let url;

      // Adjust end date by adding one day if the interval is '1day'
      if (interval === "1day") {
        // Add 1 day to the current end date
        currentEndDate = currentEndDate.plus({ days: 1 });
        if (
          currentStartDate.toFormat(dateFormat) ===
          currentEndDate.toFormat(dateFormat)
        ) {
          // If the start and end dates are the same, use 'date' parameter
          url = `${initialUrl}&date=${encodeURIComponent(
            currentStartDate.toFormat(dateFormat)
          )}&apikey=${apiKey}&outputsize=1`;
        } else {
          url = `${initialUrl}&start_date=${encodeURIComponent(
            currentStartDate.toFormat(dateFormat)
          )}&end_date=${encodeURIComponent(
            currentEndDate.toFormat(dateFormat)
          )}&apikey=${apiKey}&outputsize=${OUTPUT_SIZE_LIMIT}`;
        }
      } else {
        url = `${initialUrl}&start_date=${encodeURIComponent(
          currentStartDate.toFormat(dateFormat)
        )}&end_date=${encodeURIComponent(
          currentEndDate.toFormat(dateFormat)
        )}&apikey=${apiKey}&outputsize=${OUTPUT_SIZE_LIMIT}`;
      }

      const response = await axios.get(url);
      const { values, status, message } = response.data;

      if (status !== "ok") {
        // If the API returns an error message indicating no data, break the loop
        if (message && message.includes("No data is available")) {
          console.warn(
            `No data available for the specified range: ${currentStartDate.toFormat(
              dateFormat
            )} to ${currentEndDate.toFormat(dateFormat)}`
          );
          break;
        }
        throw new Error(`Error fetching data: ${message || "Unknown error"}`);
      }

      if (values && values.length > 0) {
        // Concatenate the new batch to allResults
        allResults = allResults.concat(values);

        // If the number of results is less than the output size limit, assume all data has been fetched
        if (values.length < OUTPUT_SIZE_LIMIT) {
          break;
        }

        // Get the earliest datetime from the current results
        const firstDateTimeStr = values[0].datetime;

        // Parse the datetime from the API response
        const firstDateTime = DateTime.fromFormat(
          firstDateTimeStr,
          dateFormat,
          { zone: "America/New_York" }
        );

        // Check if we've reached or passed the start date
        if (firstDateTime <= startDateTime) {
          break; // Reached the start date
        }

        // Update currentEndDate to firstDateTime minus one interval
        let newEndDate = firstDateTime.minus(intervalDuration);

        if (interval === "1day") {
          // For '1day' interval, adjust to the start of the day
          newEndDate = newEndDate.startOf("day");
        } else {
          // Check if newEndDate is within market hours
          if (!isWithinMarketHours(newEndDate)) {
            // Adjust to previous market close time
            newEndDate = adjustToPreviousMarketClose(newEndDate);
          }
        }

        // Ensure newEndDate doesn't go before startDateTime
        if (newEndDate <= startDateTime) {
          currentEndDate = startDateTime;
          break;
        } else {
          currentEndDate = newEndDate;
        }
      } else {
        break; // No more data to fetch
      }
    }

    // After fetching all data, manually sort the allResults array by datetime
    allResults.sort((a, b) => {
      const dateA = DateTime.fromFormat(a.datetime, dateFormat, {
        zone: "America/New_York",
      });
      const dateB = DateTime.fromFormat(b.datetime, dateFormat, {
        zone: "America/New_York",
      });
      return dateA - dateB; // Sort in ascending order
    });

    // Optionally, remove duplicate entries based on datetime
    const uniqueResults = [];
    const seenDatetimes = new Set();

    for (const result of allResults) {
      if (!seenDatetimes.has(result.datetime)) {
        uniqueResults.push(result);
        seenDatetimes.add(result.datetime);
      }
    }

    return uniqueResults;
  } catch (error) {
    console.error(`Error while fetching data for ${symbol}:`, error.message);
    throw error;
  }
};

const aggregate2MinData = (oneMinData) => {
  const groupedData = {};

  oneMinData.forEach((candle) => {
    const dt = DateTime.fromFormat(candle.datetime, "yyyy-MM-dd HH:mm:ss", {
      zone: "America/New_York",
    });

    // Round down to even minutes for 2-min grouping
    const roundedMinute = Math.floor(dt.minute / 2) * 2;
    const groupKey = dt
      .set({ minute: roundedMinute })
      .toFormat("yyyy-MM-dd HH:mm:ss");

    if (!groupedData[groupKey]) {
      // First candle in the 2-min interval
      groupedData[groupKey] = {
        datetime: groupKey,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || "0",
      };
    } else {
      // Update existing 2-min candle
      groupedData[groupKey].high = Math.max(
        parseFloat(groupedData[groupKey].high),
        parseFloat(candle.high)
      ).toString();
      groupedData[groupKey].low = Math.min(
        parseFloat(groupedData[groupKey].low),
        parseFloat(candle.low)
      ).toString();
      groupedData[groupKey].close = candle.close;
      groupedData[groupKey].volume = (
        parseFloat(groupedData[groupKey].volume) +
        parseFloat(candle.volume || "0")
      ).toString();
    }
  });

  return Object.values(groupedData).sort(
    (a, b) =>
      DateTime.fromFormat(a.datetime, "yyyy-MM-dd HH:mm:ss", {
        zone: "America/New_York",
      }) -
      DateTime.fromFormat(b.datetime, "yyyy-MM-dd HH:mm:ss", {
        zone: "America/New_York",
      })
  );
};

// Helper function to fetch data from MarketStack API for indices
const fetchMarketStackData = async (symbol, startDate, endDate, apiKey) => {
  // Construct the URL
  const url = `https://api.marketstack.com/v1/tickers/${symbol}/eod?access_key=${apiKey}&date_from=${startDate}&date_to=${endDate}&sort=ASC&limit=1000`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data && data.data && data.data.eod) {
      const eodData = data.data.eod;

      // Map eodData to 'values' format
      const values = eodData.map((item) => {
        // Parse the date from MarketStack and format it to 'yyyy-MM-dd HH:mm:ss'
        const dateTime = DateTime.fromISO(item.date, { zone: "UTC" })
          .setZone("America/New_York")
          .toFormat("yyyy-MM-dd HH:mm:ss");

        return {
          datetime: dateTime,
          open: item.open.toString(),
          high: item.high.toString(),
          low: item.low.toString(),
          close: item.close.toString(),
          volume: item.volume ? item.volume.toString() : null,
        };
      });

      // Return the values array
      return values;
    } else {
      // No data found
      console.warn(
        `No data returned from MarketStack API for symbol ${symbol} from ${startDate} to ${endDate}`
      );
      return [];
    }
  } catch (error) {
    console.error(
      `Error fetching data from MarketStack API for symbol ${symbol}: ${error.message}`
    );
    throw error;
  }
};

// Helper function to fetch data recursively and handle pagination

// Main function to handle the request
// const stockOhlc = async (req, res, next) => {
//   const { symbol: s, interval, end_date, start_date, split_date } = req.body;

//   const { symbol, isIndex } = getCorrectSymbol(s);

//   try {
//     //If it is an index fund
//     if (isIndex) {
//       // // Adjust symbol for MarketStack API
//       // let marketStackSymbol = symbol;
//       // if (!symbol.endsWith(".INDX")) {
//       //   marketStackSymbol = `${symbol}.INDX`;
//       // }

//       // Extract dates
//       const replayFromDate = split_date.split(" ")[0];
//       const replayToDate = end_date.split(" ")[0];

//       const historicalFromDate = start_date.split(" ")[0];
//       const historicalToDate = split_date.split(" ")[0];

//       const details = {
//         replayData: {
//           fromDate: replayFromDate,
//           toDate: replayToDate,
//         },
//         historicalData: {
//           fromDate: historicalFromDate,
//           toDate: historicalToDate,
//         },
//       };

//       // Fetch data from MarketStack API
//       const [currentResults, historicalResults] = await Promise.all([
//         fetchMarketStackData(
//           symbol,
//           replayFromDate,
//           replayToDate,
//           marketStackApiKey
//         ),
//         fetchMarketStackData(
//           symbol,
//           historicalFromDate,
//           historicalToDate,
//           marketStackApiKey
//         ),
//       ]);

//       if (
//         (currentResults && currentResults.length > 0) ||
//         (historicalResults && historicalResults.length > 0)
//       ) {
//         return res.status(200).json({
//           message: `${symbol} data fetched successfully`,
//           data: {
//             symbol,
//             fromDate: historicalFromDate,
//             toDate: replayToDate,
//             details,
//             results: currentResults || [],
//             historicalResults: historicalResults || [],
//             isIndex: isIndex,
//           },
//         });
//       } else {
//         return res.status(200).json({
//           message: `No data available for ${symbol} from ${historicalFromDate} to ${replayToDate}`,
//           data: { symbol, fromDate: historicalFromDate, toDate: replayToDate },
//         });
//       }
//     } else {
//       const fromDate = start_date;
//       const toDate = end_date;

//       const details = {
//         replayData: {
//           fromDate: split_date,
//           toDate: end_date,
//         },
//         historicalData: {
//           fromDate: start_date,
//           toDate: split_date,
//         },
//       };

//       // Construct the base TwelveData API URL
//       const initialUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&order=ASC`;

//       // Fetch data for both current and historical periods
//       const [currentResults, historicalResults] = await Promise.all([
//         fetchAllData(
//           initialUrl,
//           apiKey,
//           split_date,
//           end_date,
//           symbol,
//           interval
//         ),
//         fetchAllData(
//           initialUrl,
//           apiKey,
//           start_date,
//           split_date,
//           symbol,
//           interval
//         ),
//       ]);

//       if (
//         (currentResults && currentResults.length > 0) ||
//         (historicalResults && historicalResults.length > 0)
//       ) {
//         return res.status(200).json({
//           message: `${symbol} data fetched successfully`,
//           data: {
//             symbol,
//             fromDate,
//             toDate,
//             details,
//             results: currentResults || [],
//             historicalResults: historicalResults || [],
//             isIndex: isIndex,
//           },
//         });
//       } else {
//         return res.status(200).json({
//           message: `No data available for ${symbol} from ${fromDate} to ${toDate}`,
//           data: { symbol, fromDate, toDate },
//         });
//       }
//     }
//   } catch (error) {
//     console.error(`Error while fetching ${symbol} data:`, error.message);
//     return res.status(500).json({
//       message: `Failed to fetch ${symbol} data`,
//       error: error.message,
//     });
//   }
// };

// Main function to handle the request
const stockOhlc = async (req, res, next) => {
  const { symbol: s, interval, end_date, start_date, split_date } = req.body;

  // If interval is 2min, use 1min data and aggregate
  const apiInterval = interval === "2min" ? "1min" : interval;
  const { symbol, isIndex } = getCorrectSymbol(s);

  try {
    //If it is an index fund
    if (isIndex) {
      // Extract dates
      const replayFromDate = split_date.split(" ")[0];
      const replayToDate = end_date.split(" ")[0];

      const historicalFromDate = start_date.split(" ")[0];
      const historicalToDate = split_date.split(" ")[0];

      const details = {
        replayData: {
          fromDate: replayFromDate,
          toDate: replayToDate,
        },
        historicalData: {
          fromDate: historicalFromDate,
          toDate: historicalToDate,
        },
      };

      // Fetch data from MarketStack API
      const [currentResults, historicalResults] = await Promise.all([
        fetchMarketStackData(
          symbol,
          replayFromDate,
          replayToDate,
          marketStackApiKey
        ),
        fetchMarketStackData(
          symbol,
          historicalFromDate,
          historicalToDate,
          marketStackApiKey
        ),
      ]);

      let dataAvailable =
        (currentResults && currentResults.length > 0) ||
        (historicalResults && historicalResults.length > 0);

      if (!dataAvailable) {
        // No data from MarketStack, try TwelveData
        let adjustedSymbol = symbol.replace(".INDX", "");

        const initialUrl = `https://api.twelvedata.com/time_series?symbol=${adjustedSymbol}&interval=${apiInterval}&order=ASC`;

        const [currentResultsTd, historicalResultsTd] = await Promise.all([
          fetchAllData(
            initialUrl,
            apiKey,
            split_date,
            end_date,
            adjustedSymbol,
            interval
          ),
          fetchAllData(
            initialUrl,
            apiKey,
            start_date,
            split_date,
            adjustedSymbol,
            interval
          ),
        ]);

        dataAvailable =
          (currentResultsTd && currentResultsTd.length > 0) ||
          (historicalResultsTd && historicalResultsTd.length > 0);

        if (dataAvailable) {
          // Data available from TwelveData
          // Add 2-minute aggregation here
          if (interval === "2min" && dataAvailable) {
            const aggregatedCurrentResults = currentResultsTd
              ? aggregate2MinData(currentResultsTd)
              : [];
            const aggregatedHistoricalResults = historicalResultsTd
              ? aggregate2MinData(historicalResultsTd)
              : [];

            return res.status(200).json({
              message: `${adjustedSymbol} data fetched and aggregated to 2-minute intervals from TwelveData`,
              data: {
                symbol: adjustedSymbol,
                fromDate: historicalFromDate,
                toDate: replayToDate,
                details,
                results: aggregatedCurrentResults,
                historicalResults: aggregatedHistoricalResults,
                isIndex: false,
              },
            });
          }

          return res.status(200).json({
            message: `${adjustedSymbol} data fetched successfully from TwelveData`,
            data: {
              symbol: adjustedSymbol,
              fromDate: historicalFromDate,
              toDate: replayToDate,
              details,
              results: currentResultsTd || [],
              historicalResults: historicalResultsTd || [],
              isIndex: false,
            },
          });
        } else {
          return res.status(200).json({
            message: `No data available for ${symbol} from ${historicalFromDate} to ${replayToDate}`,
            data: {
              symbol,
              fromDate: historicalFromDate,
              toDate: replayToDate,
            },
          });
        }
      } else {
        // Data available from MarketStack
        return res.status(200).json({
          message: `${symbol} data fetched successfully from MarketStack`,
          data: {
            symbol,
            fromDate: historicalFromDate,
            toDate: replayToDate,
            details,
            results: currentResults || [],
            historicalResults: historicalResults || [],
            isIndex: isIndex,
          },
        });
      }
    } else {
      const fromDate = start_date;
      const toDate = end_date;

      const details = {
        replayData: {
          fromDate: split_date,
          toDate: end_date,
        },
        historicalData: {
          fromDate: start_date,
          toDate: split_date,
        },
      };

      // Construct the base TwelveData API URL
      const initialUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${apiInterval}&order=ASC`;

      try {
        // Fetch data for both current and historical periods
        const [currentResults, historicalResults] = await Promise.all([
          fetchAllData(
            initialUrl,
            apiKey,
            split_date,
            end_date,
            symbol,
            interval
          ),
          fetchAllData(
            initialUrl,
            apiKey,
            start_date,
            split_date,
            symbol,
            interval
          ),
        ]);

        let dataAvailable =
          (currentResults && currentResults.length > 0) ||
          (historicalResults && historicalResults.length > 0);

        if (!dataAvailable) {
          // No data from TwelveData, try MarketStack
          const replayFromDate = split_date.split(" ")[0];
          const replayToDate = end_date.split(" ")[0];

          const historicalFromDate = start_date.split(" ")[0];
          const historicalToDate = split_date.split(" ")[0];

          const [currentResultsMs, historicalResultsMs] = await Promise.all([
            fetchMarketStackData(
              symbol,
              replayFromDate,
              replayToDate,
              marketStackApiKey
            ),
            fetchMarketStackData(
              symbol,
              historicalFromDate,
              historicalToDate,
              marketStackApiKey
            ),
          ]);

          dataAvailable =
            (currentResultsMs && currentResultsMs.length > 0) ||
            (historicalResultsMs && historicalResultsMs.length > 0);

          if (dataAvailable) {
            // Add 2-minute aggregation here
            if (interval === "2min" && dataAvailable) {
              const aggregatedCurrentResults = currentResultsTd
                ? aggregate2MinData(currentResultsTd)
                : [];
              const aggregatedHistoricalResults = historicalResultsTd
                ? aggregate2MinData(historicalResultsTd)
                : [];

              return res.status(200).json({
                message: `${adjustedSymbol} data fetched and aggregated to 2-minute intervals from TwelveData`,
                data: {
                  symbol: adjustedSymbol,
                  fromDate: historicalFromDate,
                  toDate: replayToDate,
                  details,
                  results: aggregatedCurrentResults,
                  historicalResults: aggregatedHistoricalResults,
                  isIndex: false,
                },
              });
            }

            return res.status(200).json({
              message: `${symbol} data fetched successfully from MarketStack`,
              data: {
                symbol,
                fromDate,
                toDate,
                details,
                results: currentResultsMs || [],
                historicalResults: historicalResultsMs || [],
                isIndex: isIndex,
              },
            });
          } else {
            return res.status(200).json({
              message: `No data available for ${symbol} from ${fromDate} to ${toDate}`,
              data: { symbol, fromDate, toDate },
            });
          }
        } else {
          // Data available from TwelveData
          return res.status(200).json({
            message: `${symbol} data fetched successfully from TwelveData`,
            data: {
              symbol,
              fromDate,
              toDate,
              details,
              results: currentResults || [],
              historicalResults: historicalResults || [],
              isIndex: false,
            },
          });
        }
      } catch (error) {
        // If TwelveData throws an error (e.g., error code 404), try MarketStack
        if (
          error.response &&
          error.response.data &&
          error.response.data.code === 404
        ) {
          // Try MarketStack
          const replayFromDate = split_date.split(" ")[0];
          const replayToDate = end_date.split(" ")[0];

          const historicalFromDate = start_date.split(" ")[0];
          const historicalToDate = split_date.split(" ")[0];

          const [currentResultsMs, historicalResultsMs] = await Promise.all([
            fetchMarketStackData(
              symbol,
              replayFromDate,
              replayToDate,
              marketStackApiKey
            ),
            fetchMarketStackData(
              symbol,
              historicalFromDate,
              historicalToDate,
              marketStackApiKey
            ),
          ]);

          dataAvailable =
            (currentResultsMs && currentResultsMs.length > 0) ||
            (historicalResultsMs && historicalResultsMs.length > 0);

          if (dataAvailable) {
            return res.status(200).json({
              message: `${symbol} data fetched successfully from MarketStack`,
              data: {
                symbol,
                fromDate,
                toDate,
                details,
                results: currentResultsMs || [],
                historicalResults: historicalResultsMs || [],
                isIndex: isIndex,
              },
            });
          } else {
            return res.status(200).json({
              message: `No data available for ${symbol} from ${fromDate} to ${toDate}`,
              data: { symbol, fromDate, toDate },
            });
          }
        } else {
          return res.status(500).json({
            message: `Failed to fetch ${symbol} data`,
            error: error.message,
          });
        }
      }
    }
  } catch (error) {
    return res.status(500).json({
      message: `Failed to fetch ${symbol} data`,
      error: error.message,
    });
  }
};

module.exports = stockOhlc;
