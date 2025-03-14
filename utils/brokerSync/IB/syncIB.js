const fetchIBKRTrades = require("../../../services/brokerSync/IB/fetchIBKRTrades");
const _ = require("lodash");
const convertToNumber = require("../../../services/util/convertToNumber");

const { formatDate } = require("../../../services/util/dayjsHelperFunctions");
const AccountModel = require("../../../models/Account.model");
const dayjs = require("dayjs");
const timezone = require("dayjs/plugin/timezone");
const saveTrades = require("../../../services/saveTrades");
dayjs.extend(timezone);

const syncIB = async ({ broker, importVia, timeZone = "America/New_York" }) => {
  try {
    const response = await fetchIBKRTrades({
      token: broker?.details?.flexToken,
      queryId: broker?.details?.reportId,
      brokerName: broker?.broker,
      accountId: broker?.accountId,
      importVia,
    });

    // fs.writeFileSync(
    //   `${broker?.accountName}.json`,
    //   JSON.stringify(response, null, 2)
    // );
    // const response = JSON.parse(fs.readFileSync("full.json"));

    const account = await AccountModel.findOne({ uuid: broker.accountId });
    const uniqueTrades = _.uniqBy(response, "TradeID");

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
          code: data?.["CurrencyPrimary"]?.toLowerCase(),
          name: data?.["CurrencyPrimary"],
          //since , IBKR return Base to Currency, we need to convert it to Currency to Base
          ...(data?.["FXRateToBase"] && {
            conversionRate: 1 / data?.["FXRateToBase"],
          }),
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
          instrument: data["Put/Call"]?.toLowerCase() === "p" ? "put" : "call",
        }),
      };
    });

    await saveTrades({
      trades,
      account: account?._doc,
      brokerName: broker?.broker,
      allOrderIds,
      importVia,
      timeZone,
      userId: broker?.userId,
    });
    return;
  } catch (err) {
    throw new Error(err);
  }
};
module.exports = syncIB;
