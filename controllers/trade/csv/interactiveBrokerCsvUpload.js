const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const { getSocket } = require("../../../utils/socket/io.utils");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const { formatDate } = require("../../../services/util/dayjsHelperFunctions");
const { default: axios } = require("axios");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const IBKeys = [
  "DateTime",
  "Symbol",
  "AssetClass",
  "TradeID",
  "IBCommission",
  "Quantity",
  "TradePrice",
  "Buy/Sell",
  "Open/CloseIndicator",
  "Buy/Sell",
  "UnderlyingSymbol",
  // "Multiplier",
  "Strike",
  "Expiry",
  "Put/Call",
  "ClosePrice",
];
const interactiveBrokerCsvUpload = async (req, res, next) => {
  try {
    const io = getSocket();
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
            if (!data.every((item) => IBKeys.every((key) => key in item))) {
              const missingKeys = IBKeys.filter(
                (key) => !data.every((item) => key in item)
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
          uuid: account?.[0],
        });
        const uniqueTrades = _.uniqBy(results, "TradeID");

        let allOrderIds = [];
        const trades = uniqueTrades?.map((data) => {
          //old code
          // const sanitizedDate = dayjs(
          //   data?.["DateTime"]
          //     .replace(",", "")
          //     .replace(":", "")
          //     .replace(" ", "")
          //     .replace(";", "")
          //     .replace("/", "")
          //     .replace("-", ""),
          //   "YYYYMMDDHHmmss"
          // );
          // const date = dayjs(sanitizedDate).format("YYYY-MM-DD");
          // const time = dayjs(sanitizedDate).format("HH:mm:ss");

          // const newDate = `${date} ${time}`;

          //updated Code
          const sanitizedFormat = data?.["DateTime"]
            .replaceAll(",", "")
            .replaceAll(":", "")
            .replaceAll(" ", "")
            .replaceAll(";", "")
            .replaceAll("/", "")
            .replaceAll("-", "");

          const { date, time } = formatDate(sanitizedFormat);

          const newDate = `${date} ${time}`;

          allOrderIds.push(convertToNumber(data["TradeID"]));
          const isExercised =
            data["Open/CloseIndicator"] === "C" &&
            Math.abs(convertToNumber(data["TradePrice"])) === 0;
          return {
            orderId: convertToNumber(data["TradeID"])?.toString()?.trim(),
            assetClass:
              data["AssetClass"] === "OPT"
                ? "option"
                : data["AssetClass"] === "STK"
                ? "stocks"
                : "",
            symbol: data["Symbol"],
            date: newDate,
            quantity: Math.abs(convertToNumber(data["Quantity"])),
            price: Math.abs(convertToNumber(data["TradePrice"])),
            commission: Math.abs(convertToNumber(data["IBCommission"])),
            side: data["Buy/Sell"]?.toLowerCase(),
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            // for options
            ...(data["UnderlyingSymbol"] && {
              underlyingSymbol: data["UnderlyingSymbol"],
            }),
            ...(data["Multiplier"] && {
              contractMultiplier: convertToNumber(data["Multiplier"]),
            }),
            ...(data["Strike"] && {
              strike: Math.abs(convertToNumber(data["Strike"])),
            }),
            ...(data["Expiry"] && {
              // expDate: utcDate({ date: data["Expiry"] }),
              expDate: data["Expiry"],
            }),
            ...(isExercised && {
              isExercised: true,
            }),
            ...(isExercised && {
              closePrice: Math.abs(convertToNumber(data["ClosePrice"])),
            }),
            ...(data["Put/Call"] && {
              instrument:
                data["Put/Call"]?.toLowerCase() === "p" ? "put" : "call",
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

module.exports = interactiveBrokerCsvUpload;
