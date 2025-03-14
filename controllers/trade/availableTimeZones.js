const timezoneSearch = require("../../services/trade/timezone");

const availableTimeZones = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const data = await timezoneSearch({ keyword });
    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = availableTimeZones;
