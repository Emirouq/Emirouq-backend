const Execution = require("../../../models/Execution.model");
const convertToNumber = require("../../util/convertToNumber");
const {
  groupTradesByAssetClass,
  sortTradesByDateTime,
} = require("../../util/groupFunctions");
const checkDuplicateRecords = async ({
  data,
  accountId,
  brokerName,
  importVia,
}) => {
  // first get all the order ids from the data
  const arrayOfOrderIds = data?.map((i) =>
    convertToNumber(i?.["TradeID"])?.toString()?.trim()
  );

  // find all the execution records with the order ids
  const execution = await Execution.find(
    {
      orderId: { $in: arrayOfOrderIds },
      accountId,
      brokerName,
      importVia,
    },
    {
      orderId: 1,
    }
  );

  // get all the order ids from the execution records
  const executionOrderIds = execution.map((doc) => doc?._doc?.orderId);

  // Filter the data array to remove order IDs present in executionOrderIds
  const filteredData = data?.filter(
    (item) =>
      !executionOrderIds.includes(
        convertToNumber(item?.["TradeID"])?.toString()?.trim()
      )
  );

  const groupRecord = groupTradesByAssetClass(filteredData);
  for (const assetClass in groupRecord) {
    for (const symbol in groupRecord[assetClass]) {
      groupRecord[assetClass][symbol] = sortTradesByDateTime(
        groupRecord[assetClass][symbol]
      );
    }
  }
  return groupRecord;
};

module.exports = checkDuplicateRecords;
