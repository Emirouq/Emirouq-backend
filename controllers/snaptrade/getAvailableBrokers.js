const snap_brokerage_master = require("../../config/snap_brokerage_master.json");

const getAvailableBrokers = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: snap_brokerage_master,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAvailableBrokers;
