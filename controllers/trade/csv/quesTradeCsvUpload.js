const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const AccountModel = require("../../../models/Account.model");
const dayjs = require("dayjs");
const saveTrades = require("../../../services/saveTrades");
const convertToNumber = require("../../../services/util/convertToNumber");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const questradeKeys = [
  "Symbol",
  "Action",
  "Qty",
  "Fill price",
  "Total fees",
  "Updated time",
  "Order ID",
  "Option type",
  "Strike",
  "Expiration",
  // "Multiplier",
];
const quesTradeCsvUpload = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    const { uuid: userId } = req.user;
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        const { account, brokerName, timeZone } = fields;

        let results = [];
        //check if the file is in correct format

        for (const file of files?.csv || []) {
          try {
            const data = await new Promise((resolve, reject) => {
              const stream = fs
                .createReadStream(file?.filepath || file?.path)
                .pipe(csv());

              stream.on("data", (data) => results.push(data));
              stream.on("end", () => resolve(results));
              stream.on("error", (error) => reject(error));
            });

            // Validate CSV data
            if (
              !data.every((item) => questradeKeys.every((key) => key in item))
            ) {
              const missingKeys = questradeKeys.filter(
                (key) => !data.every((item) => key in item)
              );
              throw new Error(
                `Invalid CSV file: Missing keys: ${missingKeys.join(", ")}`
              );
            }
          } catch (error) {
            throw new Error(error?.message || "An unknown error occurred");
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
          },
        });

        res.status(200).json({
          message: "CSV fetched successfully",
        });

        const executedTrades = results?.filter(
          (trade) => trade?.Status === "Executed"
        );

        const uniqueTrades = _.uniqBy(executedTrades, "Order ID");

        const accountDetails = await AccountModel.findOne({
          uuid: account?.[0],
        });
        let allOrderIds = [];
        const trades = uniqueTrades?.map((data) => {
          const date = dayjs(
            data["Updated time"],
            "DD MMM YYYY HH:mm:ss A"
          ).format("YYYY-MM-DD");
          const time = dayjs(
            data["Updated time"],
            "DD MMM YYYY HH:mm:ss A"
          ).format("HH:mm:ss");

          const newDate = `${date} ${time}`;
          allOrderIds.push(convertToNumber(data["Order ID"]));
          return {
            orderId: convertToNumber(data["Order ID"])?.toString()?.trim(),
            assetClass:
              data["Option type"] || data["Strike"] || data["Expiration"]
                ? "option"
                : !data["Option type"]
                ? "stocks"
                : "",
            symbol: data["Symbol"]?.trim()?.toUpperCase(),
            date: newDate,
            quantity: Math.abs(convertToNumber(data["Qty"])),
            price: Math.abs(convertToNumber(data["Fill price"])),
            commission: Math.abs(convertToNumber(data["Total fees"])),
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            side:
              data["Action"] === "SHRT" ||
              data["Action"] === "Sell" ||
              data["Action"] === "STC" ||
              data["Action"] === "STO"
                ? "sell"
                : "buy",

            // for options

            ...(data["Multiplier"] && {
              contractMultiplier: convertToNumber(data["Multiplier"]),
            }),
            ...(data["Strike"] && {
              strike: Math.abs(convertToNumber(data["Strike"])),
            }),
            ...(data["Expiration"] && {
              expDate: data["Expiration"],
              // expDate: utcDate({ date: data["Expiration"] }),
            }),
            ...(data["Option type"] && {
              instrument:
                data["Option type"]?.toLowerCase() === "put" ? "put" : "call",
            }),
          };
        });

        await saveTrades({
          trades,
          account: accountDetails?._doc,
          allOrderIds,
          timeZone: timeZone?.[0],
          brokerName: brokerName?.[0],
          userId,
          importVia: "csv",
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
            // error is the error message
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

module.exports = quesTradeCsvUpload;
