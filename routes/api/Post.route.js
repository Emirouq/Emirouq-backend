const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");

router.post("/:id", addPost);

module.exports = router;
