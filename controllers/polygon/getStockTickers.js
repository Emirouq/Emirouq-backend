// const httpErrors = require("http-errors");
const getTickers = require("../../services/polygon/getTickers");

const getStockTickers = async (req, res, next) => {
  try {
    const { keyword, market } = req.query;

    const response = await getTickers({ keyword, market });

    res.status(200).json({
      message: "Tickers fetched successfully",
      data: response?.data?.results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getStockTickers;
