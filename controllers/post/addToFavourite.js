const Post = require("../../models/Post.model");
const httpErrors = require("http-errors");
const User = require("../../models/User.model");

const addToFavourite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uuid } = req.user;

    const post = await Post.findOne({ uuid: id });
    if (!post) {
      throw httpErrors.NotFound("Post not found");
    }

    const user = await User.findOne({ uuid: uuid });
    console.log("user", user?.favourites, user?.favourites?.includes(uuid));
    if (user?.favourites?.includes(id)) {
      await User.findOneAndUpdate(
        { uuid: uuid },
        { $pull: { favourites: id } },
        { new: true }
      );
      res.status(200).json({
        message: "Removed from favourites!",
        post,
      });
    } else {
      await User.findOneAndUpdate(
        { uuid: uuid },
        { $addToSet: { favourites: id } },
        { new: true }
      );
      res.status(200).json({
        message: "Added to favourites!",
        post,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = addToFavourite;
