const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  getAllBroadcasts,
  getActiveBroadcasts,
  getBroadcastStats,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast
} = require("../../controller/Broadcast/broadcastController");

const router = express.Router();

// All broadcast routes are protected
router.use(protect);

router.get("/active", getActiveBroadcasts);
router.get("/stats", getBroadcastStats);
router.get("/", getAllBroadcasts);
router.post("/", createBroadcast);
router.put("/:id", updateBroadcast);
router.delete("/:id", deleteBroadcast);

module.exports = router;
