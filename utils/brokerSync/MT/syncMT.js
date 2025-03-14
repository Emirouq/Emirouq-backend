const _ = require("lodash");

const AccountModel = require("../../../models/Account.model");
// const responseData = require("./data.json");
const saveTrades = require("../../../services/saveTrades");
const {
  connectMetaTraderAccount,
} = require("../../../services/brokerSync/MT/fetchMetaTraderTrades");

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { forexCommodities } = require("../../html-json");
// XAU: Gold
// 	•	XAG: Silver
// 	•	XPT: Platinum
// 	•	XPD: Palladium
// 	•	XRO: Rhodium

const syncMT = async ({
  broker,
  importVia,
  timeZone = "America/New_York",
  startTime,
}) => {
  try {
    const response = await connectMetaTraderAccount(broker, startTime);
    // fs.writeFileSync(
    //   `${broker?.accountName}.json`,
    //   JSON.stringify(response, null, 2)
    // );
    // const response = JSON.parse(fs.readFileSync("META TESTING.json"));

    // Fetch all the deals data
    // let response = responseData; // This should be the deals data from your API

    console.log("I am running from syncMt");

    const account = await AccountModel.findOne({ uuid: broker.accountId });
    // const uniqueDeals = _.uniqBy(response, "id");

    const executions = []; // Array to hold all executions
    const allOrderIds = [];

    // Sort deals by time
    const sortedDeals = response.sort(
      (a, b) => new Date(a?.time) - new Date(b?.time)
    );

    // Process each deal
    for (const deal of sortedDeals) {
      const symbol = deal?.symbol ? deal?.symbol?.replaceAll(".", "") : null;
      const dealType = deal.type;

      // Skip deals that are not BUY or SELL
      // if (dealType !== "DEAL_TYPE_BUY" && dealType !== "DEAL_TYPE_SELL") {
      //   continue;
      // }
      if (!["DEAL_TYPE_BUY", "DEAL_TYPE_SELL"].includes(dealType)) {
        continue;
      }

      const side = dealType === "DEAL_TYPE_BUY" ? "buy" : "sell";
      const volume = Math.abs(deal?.volume);
      const quantity = _.round(volume, 5); // For Forex, we use volume directly
      const price = _.round(Math.abs(deal?.price), 5);
      const profit = Math.abs(deal?.profit);
      const commission = _.round(Math.abs(deal?.commission), 5);
      const date = deal?.time
        ? new Date(deal.time).toISOString()
        : new Date().toISOString();
      const orderId = deal?.id?.toString()?.trim();
      const swap = _.round(Math.abs(deal?.swap), 5);
      // since  if a trade is open position, and its  does not have any orderId
      // then we will not be able to close it, , if we are creating a new orderId
      // coz Math.random() will generate a new orderId,
      // then it will be difficult to find the orderId in DB , since we are using Math.random()
      // if (orderId) {
      // } else {
      //   // Generate a unique ID if orderId is not available
      //   orderId = `deal_${dealIndex}_${Math.random()
      //     .toString(36)
      //     .substring(2, 15)}`;
      //   allOrderIds.push(orderId);
      // }
      const uniqueId = `${orderId}-${symbol}-${date}-${side}`;
      allOrderIds.push(uniqueId);
      const execution = {
        orderId: uniqueId,
        symbol: `${symbol}-${orderId}`,
        assetClass: "forex",
        underlyingSymbol: symbol,
        date,
        quantity,
        price,
        commission,
        swap,
        side,
        profit,
        contractMultiplier: forexCommodities?.includes(symbol) ? 100 : 100000,
        currency: {
          // code: isBaseUSD ? "USD" : fromCurrency,
          // name: isBaseUSD ? "US Dollar" : fromCurrency,
          code: "USD",
          name: "US Dollar",
        },
      };

      executions.push(execution);
    }

    // console.log("executions: ", executions);

    // Save the executions using your existing saveTrades function
    await saveTrades({
      trades: executions,
      account: account?._doc,
      brokerName: broker?.broker,
      allOrderIds,
      importVia,
      timeZone,
      userId: broker?.userId,
      //since date is already in UTC format, so we will pass fromSnap as true
      fromSnap: true,
    });

    return;
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = syncMT;
