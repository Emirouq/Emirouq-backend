const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const {
  formatDate,
  dateToFormattedString,
  zerodhaParseOptionSymbol,
  parseOptionSymbol,
} = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");

const zerodhaKeys = [
  "symbol",
  "isin",
  "trade_date",
  "exchange",
  "segment",
  "series",
  "trade_type",
  "auction",
  "quantity",
  "price",
  "trade_id",
  "order_id",
  "order_execution_time",
  // "expiry_date",
];
const zerodhaCsvUpload = async (req, res, next) => {
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
              !data.every((item) => zerodhaKeys.every((key) => key in item))
            ) {
              const missingKeys = zerodhaKeys.filter(
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
          uuid: account,
        });
        const uniqueTrades = _.uniqBy(results, "trade_id");

        let allOrderIds = [];
        const trades = uniqueTrades.map((deal) => {
          allOrderIds.push(deal?.trade_id);
          const optionDetails = parseOptionSymbol(deal?.symbol);
          const assetClass = deal?.expiry_date ? "option" : "stocks";
          return {
            orderId: deal?.trade_id,
            assetClass,
            symbol: deal?.symbol,
            date: deal?.order_execution_time,
            side: deal?.trade_type?.toLowerCase(),
            price: _.round(convertToNumber(deal?.price), 5),
            quantity: Math.abs(_.round(convertToNumber(deal?.quantity), 5)),
            commission: 0,
            ...(assetClass === "option" && {
              expDate: deal?.expiry_date,
              contractMultiplier: 1,
              ...optionDetails,
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

module.exports = zerodhaCsvUpload;
