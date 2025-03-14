const { sendEmail } = require("../util/sendEmail");
const { host, environmental } = require("../../config/keys");

const isValidNumber = (value) => {
  return typeof value === "number" && !isNaN(value);
};
// Function to validate numeric fields in trade objects
const validateTrades = ({ trades, broker }) => {
  const numericFields = [
    "quantity",
    "price",
    "commission",
    "contractMultiplier",
    "strike",
  ];

  return trades.every(async (trade) => {
    for (const field of numericFields) {
      if (trade[field] !== undefined && trade[field] !== null) {
        const numberValue = Number(trade[field]); // Attempt to convert the value to a number
        if (!isValidNumber(numberValue)) {
          const error = `Invalid number value in trade: ${field} = ${trade[field]}`;
          await sendEmail(
            ["suryapratapbbr21@gmail.com", "masafvi48@gmail.com"],
            `TradeLizer (${environmental.nodeEnv}) ${broker.broker} auto sync failed`,
            `<div>${JSON.stringify(error)}</div>`
          );
          return false;
        }
      }
    }
    return true;
  });
};

module.exports = validateTrades;
