const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const getSinglePost = require("../../controllers/post/getSinglePost");
const getAdsPost = require("../../controllers/post/getAdsPost");
const updatePost = require("../../controllers/post/updatePost");
const updatePostStatus = require("../../controllers/post/updatePostStatus");

router.post("/", addPost);
router.get("/", getPosts);
router.get("/list", getAdsPost);
router.get("/:id", getSinglePost);
router.put("/updateStatus/:id", updatePostStatus);
router.put("/updatePost/:id", updatePost);

module.exports = router;
