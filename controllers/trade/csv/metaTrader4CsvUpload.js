const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const { extractTableData } = require("../../../utils/html-json");
const createHttpError = require("http-errors");
const mt4CloseTransactionHeaders = [
  "Ticket",
  "Open Time",
  "Type",
  "Size",
  "Item",
  "Price",
  "S / L",
  "T / P",
  "Close Time",
  "Price",
  "Commission",
  "Taxes",
  "Swap",
  "Profit",
];
const mt4OpenTransactionHeaders = [
  "Ticket",
  "Open Time",
  "Type",
  "Size",
  "Item",
  "Price",
  "S / L",
  "T / P",
  "",
  "Price",
  "Commission",
  "Taxes",
  "Swap",
  "Profit",
];
const isKeysEqual = (keys1, keys2) => {
  return _.isEqual(keys1, keys2);
};

const processFiles = async (files) => {
  const largeSet = new Set();

  // Ensure `files.html` exists and is an array
  if (!files?.html || !Array.isArray(files.html)) {
    throw new Error("No files found in 'html'.");
  }

  const allRecords = await Promise.all(
    files.html.map((file) => {
      const filePath = file.filepath || file.path; // Use filepath for newer Formidable versions

      return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath, { encoding: "utf-8" });

        let fileContent = "";

        readStream.on("data", (chunk) => {
          fileContent += chunk; // Collect file data
        });

        readStream.on("end", () => {
          largeSet.add(fileContent);

          // Optionally delete the file after reading
          fs.unlink(filePath, (err) => {
            if (err) {
            } else {
            }
          });

          resolve(fileContent); // Resolve with the full file content
        });

        readStream.on("error", (err) => {
          reject(err); // Reject the promise on error
        });
      });
    })
  );

  return allRecords; // Contains the content of all files
};
const metaTrader4CsvUpload = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        let { brokerName, timeZone, account } = fields;
        brokerName = brokerName?.[0];
        timeZone = timeZone?.[0];
        account = account?.[0];
        const accountDetails = await AccountModel.findOne({
          uuid: account,
        });
        const records = await processFiles(files);
        const response = records.map((data) => extractTableData(data));
        // // here we will check if the headers are equal for all the files

        const isKeysEqualClose = response?.every((res) => {
          return isKeysEqual(mt4CloseTransactionHeaders, res?.close?.headers);
        });
        const isKeysEqualOpen = response?.every((res) => {
          return isKeysEqual(mt4OpenTransactionHeaders, res?.open?.headers);
        });
        if (!isKeysEqualClose || !isKeysEqualOpen) {
          throw createHttpError(400, "Invalid file format");
        }
        // since we have records in arrays
        // so to filter unique records we need to flatten the array
        // for both close and open transactions
        // and also for allOrderIds

        // here we are flattening the close and open transactions
        const allExecutions = response?.flatMap((res) => [
          ...res?.close?.data,
          ...res?.open?.data,
        ]);
        // here we are flattening the allOrderIds in close and open transactions
        const allOrderIds = response?.flatMap((res) => [
          ...res?.close?.allOrderIds,
          ...res?.open?.allOrderIds,
        ]);

        // remove duplicates orderIds and executions from the response
        const uniqueExecutions = _.uniqBy(allExecutions, "orderId");
        const uniqueOrderIds = _.uniq(allOrderIds);
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

        res.json({
          message: "File uploaded successfully",
        });
        await saveTrades({
          trades: uniqueExecutions,
          account: accountDetails?._doc,
          brokerName,
          allOrderIds: uniqueOrderIds,
          importVia: "csv",
          timeZone,
          isOrderIdString: true,
          userId,
        });

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

module.exports = metaTrader4CsvUpload;
