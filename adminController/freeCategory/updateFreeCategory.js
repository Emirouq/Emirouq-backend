const Joi = require("joi");
const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const SubCategory = require("../../models/SubCategory.model");
const { recordAudit } = require("../../helpers/auditLog");

const schema = Joi.object({
  isFree: Joi.boolean().required(),
  freeAdValidityDays: Joi.number().integer().min(1).max(365).required(),
});

/**
 * Switches one category or sub-category between Free and Paid.
 *
 * Only the category document changes. Ads already published keep their own
 * free/paid stamp, expiry date and purchased benefits; the switch applies to
 * ads published from now on.
 */
const updateFreeCategory = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const Model =
      type === "category"
        ? Category
        : type === "sub-category"
          ? SubCategory
          : null;
    if (!Model) throw httpErrors.BadRequest("Unknown type");

    const before = await Model.findOne({ uuid: id })
      .select("isFree freeAdValidityDays")
      .lean();

    const updated = await Model.findOneAndUpdate(
      { uuid: id },
      { $set: value },
      { new: true }
    )
      .select("uuid title isFree freeAdValidityDays")
      .lean();
    if (!updated) throw httpErrors.NotFound("Category not found");

    await recordAudit(req, {
      action: `${type === "category" ? "category" : "subCategory"}.free_changed`,
      entityType: type === "category" ? "category" : "subCategory",
      entityId: updated.uuid,
      entityName: updated.title,
      before: {
        isFree: !!before?.isFree,
        freeAdValidityDays: before?.freeAdValidityDays,
      },
      after: value,
    });

    res.json({
      message: `${updated.title} is now ${updated.isFree ? "Free" : "Paid"}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateFreeCategory;
