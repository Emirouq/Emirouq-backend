const Post = require("../../models/Post.model");
const { searchBy } = require("../../utils/socket/searchBy");
const { userLookup } = require("../../helpers/userProjection");
const getSinglePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    // for search by status, result, tradeType, tags, keyword, startDate, endDate

    const [data] = await Post.aggregate([
      {
        $match: {
          uuid: id,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subCategories",
          localField: "subCategory",
          foreignField: "uuid",
          as: "subCategory",
        },
      },
      {
        $unwind: {
          path: "$subCategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      userLookup({ localField: "userId", as: "user" }),
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "conversation",
          localField: "uuid",
          foreignField: "postId",
          as: "conversation",
        },
      },
      {
        $unwind: {
          path: "$conversation",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      userLookup({ localField: "comments.userId", as: "comments.user" }),
      {
        $unwind: {
          path: "$comments.user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          comments: {
            $push: {
              uuid: "$comments.uuid",
              userId: "$comments.userId",
              content: "$comments.content",
              createdAt: "$comments.createdAt",
              user: {
                firstName: "$comments.user.firstName",
                lastName: "$comments.user.lastName",
                profileImage: "$comments.user.profileImage",
              },
            },
          },
        },
      },
      // {
      //   $set: {
      //     comments: {
      //       $reverseArray: "$comments",
      //     },
      //   },
      // },
      // {
      //   $replaceRoot: {
      //     newRoot: {
      //       $mergeObjects: ["$doc", { comments: "$comments" }],
      //     },
      //   },
      // },
      {
        $set: {
          comments: {
            $cond: {
              if: {
                $and: [
                  { $isArray: "$comments" },
                  { $gt: [{ $size: "$comments" }, 0] },
                ],
              },
              then: { $reverseArray: "$comments" },
              else: [],
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { comments: "$comments" }],
          },
        },
      },
      {
        $lookup: {
          from: "userSubscriptions",
          localField: "subscriptionId",
          foreignField: "subscriptionId",
          // This route is public. Only the plan is needed (the boost flow
          // reads subscriptionPlan.planId); the rest of the record holds the
          // seller's Stripe ids and card fingerprints.
          pipeline: [
            { $project: { _id: 0, subscriptionPlan: 1, status: 1, endDate: 1 } },
          ],
          as: "postSubscription",
        },
      },
      {
        $unwind: {
          path: "$postSubscription",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSinglePost;
