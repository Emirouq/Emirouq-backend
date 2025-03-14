const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const {
  formatDate,
  formatWebullDate,
} = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const webullKeys = [
  "Name",
  "Symbol",
  "Side",
  "Status",
  "Filled",
  "Total Qty",
  "Price",
  "Placed Time",
];
const webullCsvUpload = async (req, res, next) => {
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

              stream.on("data", (data) => {
                // this is to filter out the rows that are not filled
                if (+data?.["Filled"] > 0) results.push(data);
              });
              stream.on("end", () => resolve(results));
              stream.on("error", (error) => reject(error));
            });

            // Validate CSV data
            if (
              !results.every((item) => webullKeys.every((key) => key in item))
            ) {
              const missingKeys = webullKeys.filter(
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
          const date = formatWebullDate(data?.["Placed Time"], timeZone);
          const assetClass =
            data?.["Name"]?.split(" ")?.includes("Put") ||
            data?.["Name"]?.split(" ")?.includes("Call")
              ? "option"
              : "stocks";
          const underlyingSymbol = data["Name"]?.split(" ")[0];
          const side = data["Side"]?.toLowerCase();
          const quantity = Math.abs(convertToNumber(data["Filled"]));
          const price = Math.abs(convertToNumber(data["Price"]));
          const orderId = `${underlyingSymbol}${side}${quantity}${price}${date}`;
          const instrument =
            assetClass === "option"
              ? data?.["Name"]?.split(" ")?.includes("Put")
                ? "put"
                : "call"
              : null;
          const contractMultiplier = assetClass === "option" ? 100 : 1;
          allOrderIds.push(orderId);
          return {
            orderId,
            assetClass,
            symbol: data["Symbol"],
            date,
            quantity,
            price,
            commission: 0,
            side,
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            // for options
            ...(underlyingSymbol && {
              underlyingSymbol,
            }),
            contractMultiplier,
            ...(instrument && {
              instrument,
            }),
          };
        });

        await saveTrades({
          trades,
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

module.exports = webullCsvUpload;
