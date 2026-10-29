const UserSubscription = require("../../models/UserSubscription.model");
const { userLookup } = require("../../helpers/userProjection");
const {
  effectiveStatusExpr,
  ADMIN_USER_PROJECTION,
  escapeRegex,
} = require("./shared");

/**
 * GET /admin/api/subscriptions
 * ?status=active|ending|expired|cancelled|inactive &categoryId= &plan=
 * &keyword= (user name/email, Stripe subscription id) &userId= &start= &limit=
 */
const listSubscriptions = async (req, res, next) => {
  try {
    const { status, categoryId, plan, keyword, userId, start, limit } = req.query;

    const match = {
      ...(categoryId && { "subscriptionPlan.categoryId": categoryId }),
      ...(plan && { "subscriptionPlan.name": plan }),
      ...(userId && { user: userId }),
    };

    const pipeline = [
      { $match: match },
      { $set: { effectiveStatus: effectiveStatusExpr() } },
      ...(status ? [{ $match: { effectiveStatus: status } }] : []),
      userLookup({ localField: "user", as: "userDetails", projection: ADMIN_USER_PROJECTION }),
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ];
    if (keyword?.trim()) {
      const pattern = new RegExp(escapeRegex(keyword.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { "userDetails.firstName": pattern },
            { "userDetails.lastName": pattern },
            { "userDetails.email": pattern },
            { subscriptionId: pattern },
          ],
        },
      });
    }

    const [result] = await UserSubscription.aggregate([
      ...pipeline,
      { $sort: { startDate: -1 } },
      {
        $facet: {
          data: [
            { $skip: parseInt(start || 0) },
            { $limit: Math.min(parseInt(limit || 20), 100) },
            {
              $lookup: {
                from: "categories",
                localField: "subscriptionPlan.categoryId",
                foreignField: "uuid",
                pipeline: [{ $project: { _id: 0, uuid: 1, title: 1 } }],
                as: "category",
              },
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            { $project: { usedFingerPrints: 0, fingerPrint: 0 } },
          ],
          count: [{ $count: "count" }],
        },
      },
    ]);

    res.json({
      message: "Subscriptions",
      data: result?.data || [],
      count: result?.count?.[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = listSubscriptions;
