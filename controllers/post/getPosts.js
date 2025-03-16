const Post = require("../../models/Post.model");
const SubCategory = require("../../models/SubCategory.model"); // Import the SubCategory model
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
      // Fetch a single post by post ID
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
        // Find all subcategories under this category
        const subcategories = await SubCategory.find({
          category: categoryId,
        }).select("uuid");

        if (subcategories.length > 0) {
          const subCategoryIds = subcategories.map((sub) => sub.uuid);
          filter.subCategory = { $in: subCategoryIds };
        }
      } else if (subCategoryId) {
        // Filter by subcategory directly
        filter.subCategory = subCategoryId;
      }

      // If no category or subcategory is provided, fetch all posts
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
