const formidable = require("formidable");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const meta5CsvRecord = require("../../../services/csvUpload/META5");
const { splitMetaTrade } = require("../../../utils/html-json");

//  deal.time = row[dealsHeader.indexOf("Time")] || null;
//  deal.order = row[dealsHeader.indexOf("Order")] || null;
//  deal.symbol = row[dealsHeader.indexOf("Symbol")] || null;
//  deal.side = row[dealsHeader.indexOf("Type")] || null;
//  deal.quantity = row[dealsHeader.indexOf("Volume")] || null;
//  deal.price = row[dealsHeader.indexOf("Price")] || null;
//  deal.swap = row[dealsHeader.indexOf("Swap")] || null;
//  deal.profit = row[dealsHeader.indexOf("Profit")] || null;
//  deal.commission = row[dealsHeader.indexOf("Commission")] || null;
//  deal.type = row[dealsHeader.indexOf("Type")] || null; // Using Type again as requested (typo in the request)
//  deal.comment = row[dealsHeader.indexOf("Comment")] || null;
//  deal.volume = row[dealsHeader.indexOf("Volume")] || null; // Using Volume again, since magic is not in the image and is also present under volume name
//  deal.deal = row[dealsHeader.indexOf("Deal")] || null; // using volume again since magic key not present in header row
//  deal.magic = row[dealsHeader.indexOf("Deal")] || null; //Since magic key not present in header, assigning deal value to it,
//  deals.push(deal);
const mt5keys = [
  "date",
  "orderId",
  "symbol",
  "side",
  "quantity",
  "price",
  "swap",
  "commission",
];

const metaTrader5CsvUpload = async (req, res, next) => {
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
        let response = [];

        //check if the file is in correct format
        for (const file of files?.csv || []) {
          try {
            response = meta5CsvRecord(file?.filepath || file?.path);
            // response = response?.flatMap((data) => splitMetaTrade(data));

            // Validate CSV data
            if (
              !response.every((item) => mt5keys.every((key) => key in item))
            ) {
              const missingKeys = mt5keys.filter(
                (key) => !response.every((item) => key in item)
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

        await saveTrades({
          trades: response,
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

module.exports = metaTrader5CsvUpload;
