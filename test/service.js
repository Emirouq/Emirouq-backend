const fs = require("fs");
// const { listAccountActivities } = require("../utils/SnapTrade.util");
const orders = require("./orders.json");
const transactions = require("./transaction.json");
const dayjs = require("dayjs");
const { round } = require("lodash");

const updateOrders = async () => {
  const newOrders = [];
  const notFound = [];
  orders.map((order) => {
    const found = transactions.find(
      (i) =>
        // i.type === order.action &&
        i.price === +order.execution_price &&
        i.symbol.symbol === order.universal_symbol.symbol &&
        Math.abs(+i.units) === Math.abs(+order.filled_quantity)
    );
    if (found) {
      newOrders.push({ ...order, commission: Math.abs(found.fee) });
    } else {
      notFound.push(order);
      // newOrders.push(order)
    }
  });
  console.log(
    "orders length: ",
    orders.length,
    ", new orders length: ",
    newOrders.length
  );
  fs.writeFileSync("newOrders.json", JSON.stringify(newOrders));
  fs.writeFileSync("notFound.json", JSON.stringify(notFound));

  const notFoundGrouped = {};

  notFound.forEach((order) => {
    const objKey = `${order.universal_symbol.symbol}-${order.action}-${dayjs(
      order.time_executed
    ).format("DD-MM-YYYY")}`;
    if (!notFoundGrouped[objKey]) notFoundGrouped[objKey] = [];
    notFoundGrouped[objKey].push(order);
  });

  const notFoundGroupedUpdated = {
    transactionFound: {},
    transactionNotFound: {},
  };

  Object.entries(notFoundGrouped).forEach(([key, value]) => {
    var sum = 0;
    var count = 0;

    for (var i = 0; i < value.length; ++i) {
      sum += +value[i].execution_price * +value[i].filled_quantity;
      count += +value[i].filled_quantity;
    }
    const average = sum / count;
    console.log("sum: ", sum, ", count: ", count, ", average: ", average);
    const found = transactions.find(
      (i) =>
        // i.type === order.action &&
        round(i.price, 3) === round(average, 3) &&
        i.symbol.symbol === value[0].universal_symbol.symbol &&
        Math.abs(+i.units) === Math.abs(+count)
    );
    if (found) {
      if (!notFoundGroupedUpdated.transactionFound[key])
        notFoundGroupedUpdated.transactionFound[key] = {
          commission: "",
          trades: [],
        };
      notFoundGroupedUpdated.transactionFound[key] = {
        commission: Math.abs(found.fee),
        trades: value.map((v) => ({
          ...v,
          commission: round(
            Math.abs(found.fee) *
              (Math.abs(+v.filled_quantity) / Math.abs(+count)),
            3
          ),
        })),
      };
    } else {
      if (!notFoundGroupedUpdated.transactionNotFound[key])
        notFoundGroupedUpdated.transactionNotFound[key] = {
          commission: "",
          trades: [],
        };
      notFoundGroupedUpdated.transactionNotFound[key] = {
        trades: value,
        average: average,
        count,
      };
    }
  });

  fs.writeFileSync("notFoundGrouped.json", JSON.stringify(notFoundGrouped));
  fs.writeFileSync(
    "notFoundGroupedUpdated.json",
    JSON.stringify(notFoundGroupedUpdated)
  );
};

updateOrders();
