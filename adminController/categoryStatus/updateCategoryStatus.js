const Joi = require("joi");
const httpErrors = require("http-errors");
const Post = require("../../models/Post.model");
const Category = require("../../models/Category.model");
const { recordAudit } = require("../../helpers/auditLog");
const { LIVE_STATUSES, resolveTarget } = require("./shared");

const schema = Joi.object({
  isActive: Joi.boolean().required(),
  // Only for disabling: keep live ads visible, or hide them until re-enabled.
  adsPolicy: Joi.string().valid("keep", "hide").default("keep"),
  note: Joi.string().trim().max(500).allow(""),
});

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * PUT /admin/api/categories/:type/:id/status   (:type = category | sub-category)
 *
 * Disabling stops new ads (enforced by the API, not just the app) and, with
 * adsPolicy "hide", parks live ads on hold. Re-enabling releases the holds,
 * restores each ad's status and moves its expiry forward by the time it was
 * hidden. Sub-categories, fields, plans and free settings are never touched,
 * so re-enabling brings the category back exactly as it was.
 */
const updateCategoryStatus = async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) throw httpErrors.BadRequest(error.message);

    const target = await resolveTarget(req.params.type, req.params.id);
    if (!target) throw httpErrors.NotFound("Category not found");
    const { Model, doc, postField, scope } = target;

    const wasActive = doc.isActive !== false;
    if (wasActive === value.isActive) {
      throw httpErrors.BadRequest(
        `${doc.title} is already ${value.isActive ? "enabled" : "disabled"}`
      );
    }

    const now = nowInSeconds();
    const details = {};

    if (!value.isActive) {
      await Model.updateOne(
        { uuid: doc.uuid },
        {
          $set: {
            isActive: false,
            disabledAt: new Date(),
            disabledBy: req.user.uuid,
            disabledAdsPolicy: value.adsPolicy,
          },
        }
      );

      if (value.adsPolicy === "hide") {
        const { modifiedCount } = await Post.updateMany(
          {
            [postField]: doc.uuid,
            status: { $in: LIVE_STATUSES },
            isExpired: { $ne: true },
            "categoryHold.heldAt": { $exists: false },
          },
          [
            {
              $set: {
                categoryHold: {
                  previousStatus: "$status",
                  heldAt: now,
                  scope,
                  refId: doc.uuid,
                },
                status: "paused",
              },
            },
          ]
        );
        details.adsHidden = modifiedCount;
      }
    } else {
      await Model.updateOne(
        { uuid: doc.uuid },
        {
          $set: { isActive: true },
          $unset: { disabledAt: "", disabledBy: "", disabledAdsPolicy: "" },
        }
      );

      // A sub-category coming back inside a category that is still disabled
      // with "hide": its ads stay hidden, now under the category's hold.
      let parentHolds = null;
      if (scope === "subCategory") {
        const parent = await Category.findOne({ uuid: doc.category }).lean();
        if (parent?.isActive === false && parent.disabledAdsPolicy === "hide") {
          parentHolds = parent.uuid;
        }
      }

      if (parentHolds) {
        const { modifiedCount } = await Post.updateMany(
          { "categoryHold.refId": doc.uuid },
          {
            $set: {
              "categoryHold.refId": parentHolds,
              "categoryHold.scope": "category",
            },
          }
        );
        details.adsStillHiddenByCategory = modifiedCount;
      } else {
        const { modifiedCount } = await Post.updateMany(
          { "categoryHold.refId": doc.uuid },
          [
            {
              $set: {
                status: "$categoryHold.previousStatus",
                // Give back the days spent hidden.
                expirationDate: {
                  $cond: [
                    { $gt: ["$expirationDate", 0] },
                    {
                      $add: [
                        "$expirationDate",
                        { $subtract: [now, "$categoryHold.heldAt"] },
                      ],
                    },
                    "$expirationDate",
                  ],
                },
              },
            },
            { $unset: "categoryHold" },
          ]
        );
        details.adsRestored = modifiedCount;
      }
    }

    await recordAudit(req, {
      action: `${scope}.${value.isActive ? "enabled" : "disabled"}`,
      entityType: scope,
      entityId: doc.uuid,
      entityName: doc.title,
      before: { isActive: wasActive },
      after: {
        isActive: value.isActive,
        ...(!value.isActive && { adsPolicy: value.adsPolicy }),
      },
      note: value.note || undefined,
      details,
    });

    const summary = value.isActive
      ? `${doc.title} enabled` +
        (details.adsRestored ? `; ${details.adsRestored} ads restored` : "") +
        (details.adsStillHiddenByCategory
          ? `; ${details.adsStillHiddenByCategory} ads stay hidden until the category is enabled`
          : "")
      : `${doc.title} disabled` +
        (details.adsHidden !== undefined
          ? `; ${details.adsHidden} ads hidden`
          : "; existing ads stay visible");

    res.json({ message: summary, data: { isActive: value.isActive, ...details } });
  } catch (error) {
    next(error);
  }
};

module.exports = updateCategoryStatus;
