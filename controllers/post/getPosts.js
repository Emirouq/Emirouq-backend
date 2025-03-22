const Post = require("../../models/Post.model");
const SubCategory = require("../../models/SubCategory.model");
const httpErrors = require("http-errors");

const getPosts = async (req, res, next) => {
  try {
    const {
      postId,
      keyword,
      page = 1,
      limit = 10,
      categoryId,
      subCategoryId,
      status,
    } = req.query;

    let data;

    if (postId) {
      data = await Post.aggregate([
        { $match: { uuid: postId } },
        {
          $lookup: {
            from: "user",
            localField: "userId",
            foreignField: "uuid",
            as: "userDetails",
          },
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      ]);

      if (!data.length) {
        throw httpErrors.NotFound("Post not found");
      }
      data = data[0];
    } else {
      let filter = {};

      if (keyword) {
        filter.title = { $regex: keyword, $options: "i" };
      }
      if (status) {
        filter.status = status;
      }
      if (categoryId) {
        const subcategories = await SubCategory.find({
          category: categoryId,
        }).select("uuid");

        if (subcategories.length > 0) {
          const subCategoryIds = subcategories.map((sub) => sub.uuid);
          filter.subCategory = { $in: subCategoryIds };
        }
      } else if (subCategoryId) {
        filter.subCategory = subCategoryId;
      }

      if (req.user?.role === "customer") {
        filter.userId = req.user.uuid;
      }
      if (req.user?.role !== "customer") {
        filter.isDraft = false;
      }

      data = await Post.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "user",
            localField: "userId",
            foreignField: "uuid",
            as: "userDetails",
          },
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      ]);
    }

    res.status(200).json({
      message: "Posts fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getPosts;
