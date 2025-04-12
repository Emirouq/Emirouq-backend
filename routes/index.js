const router = require("express").Router();

const apiRoutes = require("./api");
const adminRoutes = require("./adminApi");
const webhooks = require("../controllers/stripe/webhooks");

router.use("/admin/api", adminRoutes);
router.use("/api", apiRoutes);
router.post("/webhook", webhooks);

router.get("/ping", (req, res) => {
  res.json({ success: "true", message: "successful request" });
});

router.use((error, req, res, next) => {
  res.status(error?.status || 500);
  return res.json({
    error: {
      status: error?.status || 500,
      message: error?.message || "Internal Server Error",
    },
  });
});

module.exports = router;
