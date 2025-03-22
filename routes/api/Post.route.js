const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const updatePost = require("../../controllers/post/updatePost");
const updatePostStatus = require("../../controllers/post/updatePostStatus");

router.post("/:id", addPost);
router.get("/", getPosts);
router.put("/updateStatus/:id", updatePostStatus);
router.put("/updatePost/:id", updatePost);

module.exports = router;
