const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");
const saveTrades = require("../../../services/saveTrades");
const _ = require("lodash");
const AccountModel = require("../../../models/Account.model");
const dayjs = require("dayjs");
const convertToNumber = require("../../../services/util/convertToNumber");
function getKrakenSignature(urlPath, data, secret) {
  let encoded;
  if (typeof data === "string") {
    const jsonData = JSON.parse(data);
    encoded = jsonData.nonce + data;
  } else if (typeof data === "object") {
    const dataStr = querystring.stringify(data);
    encoded = data.nonce + dataStr;
  } else {
    throw new Error("Invalid data type");
  }

  const sha256Hash = crypto.createHash("sha256").update(encoded).digest();
  const message = urlPath + sha256Hash.toString("binary");
  const secretBuffer = Buffer.from(secret, "base64");
  const hmac = crypto.createHmac("sha512", secretBuffer);
  hmac.update(message, "binary");
  const signature = hmac.digest("base64");
  return signature;
}
async function getTradeAssetsPair() {
  try {
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://api.kraken.com/0/public/AssetPairs",
      headers: {
        Accept: "application/json",
      },
    };

    const res = await axios.request(config);
    return res?.data;
  } catch (err) {
    throw new Error(err);
  }
}

const syncKraken = async ({ broker, importVia, timeZone, startTime }) => {
  try {
    const { apiKey, privateKey } = broker?.toObject()?.details;
    const nonce = Date.now();

    let data = {
      nonce,
      type: "all",
      trades: false,
      consolidate_taker: true,
      start: dayjs(startTime),
      end: dayjs().unix(),
    };
    console.log(data, "1");

    const path = "/0/private/TradesHistory";
    const signature = getKrakenSignature(path, data, privateKey);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://api.kraken.com${path}`,
      headers: {
        "User-Agent": "Mozilla/4.0 (compatible; Node Kraken API)",
        "Content-Type": "application/x-www-form-urlencoded", // Change Content-Type to application/x-www-form-urlencoded
        "API-Key": apiKey,
        "API-Sign": signature,
      },
      data: new URLSearchParams(data).toString(), // convert data to x-www-form-urlencoded string
    };

    const response = await axios.request(config);
    const getTradeAssetsPairResponse = await getTradeAssetsPair();
    console.log("Syncing Kraken...");

    const account = await AccountModel.findOne({ uuid: broker.accountId });
    if (!account) {
      throw new Error("Account not found");
    }

    const allOrderIds = [];
    const executions = Object.keys(response?.data?.result?.trades).map(
      (key) => {
        const deal = response?.data?.result?.trades[key];
        allOrderIds.push(key);
        return {
          orderId: key,
          trade_id: deal?.trade_id,
          ordertxid: deal?.ordertxid,
          postxid: deal?.postxid,
          assetClass: "crypto",
          symbol: getTradeAssetsPairResponse?.result[deal?.pair]?.wsname,
          date: dayjs.unix(deal?.time).format(),
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
      }
    );

    // // // Save the executions using your existing saveTrades function
    await saveTrades({
      trades: executions,
      account: account?._doc,
      brokerName: broker?.broker,
      allOrderIds,
      importVia,
      timeZone,
      userId: broker?.userId,
      isOrderIdString: true,
    });
    return;
  } catch (err) {
    throw new Error(err);
  }
};
module.exports = syncKraken;
