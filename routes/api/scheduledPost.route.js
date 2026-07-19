const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  createScheduledPost,
  getAllScheduledPosts,
  updateScheduledPost,
  deleteScheduledPost,
} = require("../../controller/ScheduledPost/scheduledPostController");

const router = express.Router();

router.use(protect);

router.post("/", createScheduledPost);
router.get("/", getAllScheduledPosts);
router.put("/:id", updateScheduledPost);
router.delete("/:id", deleteScheduledPost);

module.exports = router;
