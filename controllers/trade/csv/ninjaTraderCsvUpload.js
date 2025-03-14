const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const {
  formatEtradeCsvDate,
  dateToFormattedString,
} = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const {
  getFuturePointValue,
} = require("../../../services/util/format-csv-data");
const {
  classifyAssetClass,
} = require("../../../services/util/classify-asset-class.utils");
const ninjaTraderKeys = [
  "Instrument",
  "Action",
  "Quantity",
  "Price",
  "Time",
  "ID",
  "E/X",
  "Position",
  "Order ID",
  "Name",
  "Commission",
  "Rate",
  "Account",
  "Connection",
];

const ninjaTraderCsvUpload = async (req, res, next) => {
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
                .pipe(csv());

              stream.on("data", (data) => results.push(data));
              stream.on("end", () => resolve(results));
              stream.on("error", (error) => reject(error));
            });

            // Validate CSV data
            if (
              !results.every((item) =>
                ninjaTraderKeys.every((key) => key in item)
              )
            ) {
              const missingKeys = ninjaTraderKeys.filter(
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
        const uniqueExecutions = _.uniqBy(results, "ID");

        let allOrderIds = [];
        const trades = uniqueExecutions?.map((data, index) => {
          const date = dateToFormattedString(data?.["Time"], timeZone);
          const side = data["Action"].toLowerCase();
          const quantity = Math.abs(convertToNumber(data["Quantity"]?.trim()));
          const commission = Math.abs(
            convertToNumber(data["Commission"]?.trim())
          );
          const price = Math.abs(convertToNumber(data["Price"]?.trim()));
          const orderId = data["ID"];
          const instrument = data["Instrument"];
          const symbol = instrument?.split(" ")[0]?.trim();
          const assetClass = "future";
          const contractMultiplier =
            getFuturePointValue?.find((item) => item?.symbol?.trim() === symbol)
              ?.pointValue || 1;
          allOrderIds.push(orderId);
          if (assetClass)
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
              // ...(instrument && {
              //   instrument,
              // }),
            };
          return null;
        });

        await saveTrades({
          trades: trades.filter((i) => i),
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

module.exports = ninjaTraderCsvUpload;
