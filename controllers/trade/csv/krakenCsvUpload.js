const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const { formatDate } = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");

const krakenKeys = [
  "txid",
  "ordertxid",
  "pair",
  "time",
  "type",
  "ordertype",
  "price",
  "cost",
  "fee",
  "vol",
  "margin",
  "misc",
  "ledgers",
  "posttxid",
  "posstatuscode",
  "cprice",
  "ccost",
  "cfee",
  "cvol",
  "cmargin",
  "net",
  "trades",
];
const krakenCsvUpload = async (req, res, next) => {
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
            if (!data.every((item) => krakenKeys.every((key) => key in item))) {
              const missingKeys = krakenKeys.filter(
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
        const uniqueTrades = _.uniqBy(results, "txid");

        let allOrderIds = [];
        const trades = uniqueTrades.map((deal) => {
          allOrderIds.push(deal?.txid);
          return {
            orderId: deal?.txid,
            ordertxid: deal?.ordertxid,
            posttxid: deal?.posttxid,
            assetClass: "crypto",
            symbol: deal?.pair,
            date: deal?.time,
            side: deal?.type,
            price: _.round(convertToNumber(deal?.price), 5),
            quantity: Math.abs(_.round(convertToNumber(deal?.vol), 5)),
            commission: _.round(convertToNumber(deal?.fee), 5),
            swap: deal?.cost,
            currency: {
              code: "USD",
              name: "US Dollar",
            },
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

module.exports = krakenCsvUpload;
