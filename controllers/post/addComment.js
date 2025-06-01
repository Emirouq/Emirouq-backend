const Post = require("../../models/Post.model");
const { v4: uuid } = require("uuid");

const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const { uuid: userId } = req.user;
    if (!userId || !content) {
      return res.status(400).json({ error: "userId and content are required" });
    }

    const post = await Post.findOne({ uuid: postId });
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ uuid: uuid(), userId, content });
    await post.save();

    res.status(200).json({
      success: true,
      comment: { uuid: uuid(), userId, content },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = addComment;
