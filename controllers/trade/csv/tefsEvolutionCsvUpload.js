const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const {
  dateToFormattedString,
} = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const {
  getFuturePointValue,
} = require("../../../services/util/format-csv-data");
// {
//   date: "06/01/2023 09:56:42",
//   symbol: "AAPL",
//   side: "Buy",
//   quantity: "300",
//   price: "177,55",
//   grossPnL: "0,00 USD",
//   commission: "0,00 USD",
//   netPnL: "0,00 USD",
//   tradingExchange: "NASDAQ",
//   orderType: "Market",
//   "": "",
// }
const tefsKeys = [
  "date",
  "symbol",
  "side",
  "quantity",
  "price",
  "grossPnL",
  "commission",
  "netPnL",
  "tradingExchange",
  "orderType",
];
const csvHeadersToTefsKeys = {
  "Date/Time": "date",
  Symbol: "symbol",
  Side: "side",
  Quantity: "quantity",
  Price: "price",
  "Gross P/L": "grossPnL",
  "Execution fee": "commission",
  "Net P/L": "netPnL",
  "Trading exchange": "tradingExchange",
  "Order type": "orderType",
};

const tefsEvolutionCsvUpload = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    const { uuid: userId } = req.user;

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        let { account, brokerName, timeZone } = fields;
        account = account?.[0];
        brokerName = brokerName?.[0];
        timeZone = timeZone?.[0];
        let results = [];

        //check if the file is in correct format
        for (const file of files?.csv || []) {
          try {
            await new Promise((resolve, reject) => {
              const stream = fs
                .createReadStream(file?.filepath || file?.path)
                .pipe(
                  csv({
                    separator: ";",
                    mapHeaders: ({ header }) =>
                      header && csvHeadersToTefsKeys[header?.trim()],
                  })
                );

              stream.on("data", (data) => data?.date && results.push(data));
              stream.on("end", () => resolve(results));
              stream.on("error", (error) => reject(error));
            });

            // Validate CSV data
            if (
              !results?.every((item) => tefsKeys.every((key) => key in item))
            ) {
              const missingKeys = tefsKeys?.filter(
                (key) => !results.every((item) => key in item)
              );
              throw new Error(
                `Invalid CSV file: Missing keys: ${missingKeys.join(", ")}`
              );
            }
          } catch (error) {
            throw new Error(error?.message);
          }
        }

        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "progress",
            // error is the error message
            error: null,
          },
        });

        res.status(200).json({
          message: "CSV fetched successfully",
        });

        const accountDetails = await AccountModel.findOne({
          uuid: account,
        });

        let allOrderIds = [];
        const trades = results?.map((data) => {
          const date = dateToFormattedString(data?.date);
          const side = data?.side?.toLowerCase();
          const quantity = Math.abs(convertToNumber(data?.quantity?.trim()));
          const commission = Math.abs(
            convertToNumber(data?.commission?.trim())
          );
          const price = Math.abs(
            convertToNumber(data?.price?.replace(",", ".")?.trim())
          );
          const orderId = `${date}${data?.symbol?.trim()}${quantity}${side}${price}`;
          const symbol = data?.symbol?.trim();
          const assetClass = "stocks";
          const contractMultiplier = 1;
          allOrderIds.push(orderId);
          return {
            orderId,
            assetClass,
            commission,
            symbol,
            date,
            quantity,
            price,
            side,
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            contractMultiplier,
          };
        });

        await saveTrades({
          trades: trades,
          account: accountDetails?._doc,
          allOrderIds,
          timeZone,
          brokerName,
          userId,
          importVia: "csv",
          isOrderIdString: true,
        });
        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "uploaded",
            // error is the error message
            error: null,
          },
        });
      } catch (error) {
        const errorDetails = {
          message:
            error?.message || String(error) || "An unknown error occurred",
          stack: error?.stack || null, // Include this if you want to send stack trace
        };
        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "error",
            error: errorDetails,
          },
        });
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = tefsEvolutionCsvUpload;
