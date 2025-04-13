const router = require("express").Router();

const addPost = require("../../controllers/post/addPost");
const getPosts = require("../../controllers/post/getPosts");
const getSinglePost = require("../../controllers/post/getSinglePost");
const getAdsPost = require("../../controllers/post/getAdsPost");
const updatePost = require("../../controllers/post/updatePost");
const updatePostStatus = require("../../controllers/post/updatePostStatus");
const jwtValidation = require("../../middlewares/jwt_validation");

router.post("/", jwtValidation, addPost);
router.get("/", getPosts);
router.get("/list", getAdsPost);
router.get("/:id", jwtValidation, getSinglePost);
router.put("/updateStatus/:id", jwtValidation, updatePostStatus);
router.put("/updatePost/:id", jwtValidation, updatePost);

module.exports = router;
