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
    } = req.query;

    let data;

    if (postId) {
      data = await Post.findOne({ uuid: postId });
      if (!data) {
        throw httpErrors.NotFound("Post not found");
      }
    } else {
      let filter = {};

      if (keyword) {
        filter.title = { $regex: keyword, $options: "i" };
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

      data = await Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
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
