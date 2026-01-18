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
      city,
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
        {
          $lookup: {
            from: "subCategories",
            localField: "subCategory",
            foreignField: "uuid",
            as: "subCategoryDetails",
          },
        },
        {
          $unwind: {
            path: "$subCategoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "subCategoryDetails.category",
            foreignField: "uuid",
            as: "categoryDetails",
          },
        },
        {
          $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            uuid: 1,
            title: 1,
            description: 1,
            price: 1,
            timePeriod: 1,
            location: 1,
            condition: 1,
            status: 1,
            isDraft: 1,
            createdAt: 1,
            updatedAt: 1,
            file: 1,
            userDetails: {
              firstName: 1,
              lastName: 1,
              userHandle: 1,
              profileImage: 1,
              email: 1,
              phone: 1,
              isActive: 1,
              role: 1,
            },
            subCategoryDetails: {
              title: 1,
            },
            categoryDetails: {
              title: 1,
              logo: 1,
            },
          },
        },
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
        {
          $lookup: {
            from: "subCategories",
            localField: "subCategory",
            foreignField: "uuid",
            as: "subCategoryDetails",
          },
        },
        {
          $unwind: {
            path: "$subCategoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "subCategoryDetails.category",
            foreignField: "uuid",
            as: "categoryDetails",
          },
        },
        {
          $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            uuid: 1,
            title: 1,
            description: 1,
            price: 1,
            timePeriod: 1,
            location: 1,
            condition: 1,
            status: 1,
            isDraft: 1,
            createdAt: 1,
            updatedAt: 1,
            file: 1,
            userDetails: {
              firstName: 1,
              lastName: 1,
              userHandle: 1,
              profileImage: 1,
              email: 1,
              phone: 1,
              isActive: 1,
              role: 1,
            },
            subCategoryDetails: {
              title: 1,
            },
            categoryDetails: {
              title: 1,
              logo: 1,
            },
          },
        },
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
