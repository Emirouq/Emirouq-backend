const { Schema, model } = require("mongoose");

// create a schema
var currencyToUsdSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: String,
      required: true,
      unique: true,
    },
    rates: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
const CurrencyToUsd = model(
  "CurrencyToUsd",
  currencyToUsdSchema,
  "currencyToUsd"
);

module.exports = CurrencyToUsd;
