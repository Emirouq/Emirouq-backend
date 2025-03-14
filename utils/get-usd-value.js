const axios = require("axios"); // For making HTTP requests
const CurrencyToUsd = require("../models/CurrencyToUsd.model");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
function extractDate(dateString) {
  if (dateString) {
    // Match any characters before a space or a 'T'
    const dateMatch = dateString?.match(/^(.*?)(?:\s+|T)/);
    if (dateMatch) {
      return dateMatch?.[1]?.trim();
    }
  }
  return null;
}
async function convertCurrencyToUSD(date, fromCurrency) {
  const access_key = "8e2729d97c782547d22823c22de1575f";
  let rates;
  try {
    const formatDate = extractDate(date);
    let usdRates = await CurrencyToUsd.findOne({
      date: formatDate,
    });
    if (usdRates) {
      rates = usdRates?.rates;
    } else {
      const url = `https://api.exchangeratesapi.io/v1/${formatDate}?access_key=${access_key}&base=USD`;
      const response = await axios.get(url);
      rates = response?.data?.rates;
      // since we are running this function in PROMISE.ALL
      // when same date is requested by multiple users
      // it gives an error of duplicate key
      // so we need to check if the data is already present in the db
      // if not then only save the data
      let isExist = await CurrencyToUsd.findOne({
        date: formatDate,
      });
      if (!isExist && formatDate) {
        const data = new CurrencyToUsd({
          uuid: uuid(),
          date: formatDate,
          rates,
        });
        await data.save();
      }
    }
    const usdExchangeRate = rates[fromCurrency?.toUpperCase()];

    return usdExchangeRate;
  } catch (error) {
    // we will fetch the latest data exchange rate
    // we are not throwing error here
    const url = `https://api.exchangeratesapi.io/v1/latest?access_key=${access_key}&base=USD`;
    const response = await axios.get(url);
    rates = response?.data?.rates;
    const todayDate = dayjs().format("YYYY-MM-DD");
    let isExist = await CurrencyToUsd.findOne({
      date: todayDate,
    });
    if (!isExist && todayDate) {
      const data = new CurrencyToUsd({
        uuid: uuid(),
        date: todayDate,
        rates,
      });
      await data.save();
    }
    const usdExchangeRate = rates[fromCurrency?.toUpperCase()];
    return usdExchangeRate;
  }
}

const getExchangeRate = async ({ isBaseUSD, date, fromCurrency }) => {
  if (isBaseUSD) {
    return 1;
  }
  const exchangeRate = await convertCurrencyToUSD(date, fromCurrency);
  return 1 / exchangeRate;
};

module.exports = {
  convertCurrencyToUSD,
  extractDate,
  getExchangeRate,
};
