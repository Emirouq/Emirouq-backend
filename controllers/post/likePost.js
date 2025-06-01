const Post = require("../../models/Post.model");

const likePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { uuid: userId } = req.user;

    if (!userId) return res.status(400).json({ error: "userId is required" });

    const post = await Post.findOne({ uuid: postId });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      totalLikes: post.likes.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};
module.exports = likePost;
