const FaqModel = require("../../models/Faq.model");
const { v4: uuid } = require("uuid");
const createFaq = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    const data = new FaqModel({
      uuid: uuid(),
      title,
      description,
    });

    await data.save();

    res.status(201).json({
      success: true,
      message: "Faq created successfully",
    });
  } catch (error) {
    next(error);
  }
};
module.exports = createFaq;
