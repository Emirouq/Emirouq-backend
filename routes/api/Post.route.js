const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");

router.post("/:id", addPost);
router.get("/", getPosts);

module.exports = router;
