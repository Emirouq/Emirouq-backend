const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const updatePlan = async (req, res, next) => {
  try {
    const { amount, isActive } = req.body;
    const { id } = req.params;

    await SubscriptionPlan.findOneAndUpdate(
      { uuid: id },
      {
        amount,
        isActive,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updatePlan;
