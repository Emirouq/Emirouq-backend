const SubscriptionPlan = require("../../models/SubscriptionPlan.model");

const duration = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const updatePlansOnly = async (req, res, next) => {
  try {
    const { categoryId, payload } = req.body;

    if (!Array.isArray(payload)) {
      return res
        .status(400)
        .json({ success: false, message: "Plans should be an array." });
    }

    const uuid = payload?.map((p) => p.uuid).filter(Boolean);
    await SubscriptionPlan.deleteMany({
      categoryId,
      uuid: { $nin: uuid },
    });

    for (const plan of payload) {
      const { uuid, interval, interval_count } = plan;
      const durationInDays = duration[interval] * interval_count;

      await SubscriptionPlan.findOneAndUpdate(
        { uuid },
        {
          ...plan,
          duration: durationInDays,
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Plans updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updatePlansOnly;
