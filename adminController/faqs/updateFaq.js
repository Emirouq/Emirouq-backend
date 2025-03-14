const FaqModel = require("../../models/Faq.model");
const updateFaq = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    const { id } = req.params;

    await FaqModel.findOneAndUpdate(
      { uuid: id },
      {
        ...(title && { title }),
        ...(description && { description }),
        status,
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Faq updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
module.exports = updateFaq;
