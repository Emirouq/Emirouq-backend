const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const updatePostStatus = require("../../controllers/post/updatePostStatus");

router.post("/:id", addPost);
router.get("/", getPosts);
router.put("/:id", updatePostStatus);

module.exports = router;
