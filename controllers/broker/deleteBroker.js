const BrokerSyncModel = require("../../models/BrokerSync.model");
// const { default: axios } = require("axios");
const { deleteAgenda } = require("../../services/util/callApi.utils");

const deleteBroker = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await deleteAgenda({
        id,
      });
    } catch (error) {
      console.error("Error deleting agenda", error);
    }
    await BrokerSyncModel.findOneAndDelete({ uuid: id });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteBroker;
