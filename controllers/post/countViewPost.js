const Post = require("../../models/Post.model");

const countViewPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { uuid: userId } = req.user;

    if (!userId) {
      return res.status(200).json({
        success: true,
        message: "log in first",
        totalViews: 0,
      });
    }

    // Try to add a view only if not viewed before
    const updated = await Post.findOneAndUpdate(
      { uuid: postId, viewBy: { $nin: [userId] } },
      { $addToSet: { viewBy: userId } },
      { new: true }
    );

    if (updated) {
      // User viewed now for the first time
      return res.status(200).json({
        success: true,
        viewedNow: true,
        totalViews: updated.viewBy.length,
      });
    }

    // If updated is null → user already viewed OR post doesn't exist
    const post = await Post.findOne({ uuid: postId }, { viewBy: 1 });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // User already viewed → return same structure
    return res.status(200).json({
      success: true,
      viewedNow: false,
      totalViews: post.viewBy.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = countViewPost;
