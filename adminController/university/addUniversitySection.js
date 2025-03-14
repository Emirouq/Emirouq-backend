const createHttpError = require("http-errors");
const University = require("../../models/University.model");
const { v4: uuid } = require("uuid");
/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */

const addUniversitySection = async (req, res, next) => {
  try {
    const { section } = req.body;

    const [sectionCount, isSectionExist] = await Promise.all([
      University.countDocuments(),
      University.findOne({ section }),
    ]);
    if (isSectionExist) {
      throw createHttpError(400, "Section already exist");
    }
    let index = 0;
    if (!isSectionExist) {
      index = sectionCount + 1;
    }
    const university = new University({
      uuid: uuid(),
      section,
      index,
    });
    await university.save();
    res.json({
      message: "University Section added successfully",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addUniversitySection;
