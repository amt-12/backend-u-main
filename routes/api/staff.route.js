const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getStaffStats,
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
} = require("../../controller/Staff/staffController");

router.get("/stats", protect, getStaffStats);
router.post("/", protect, addStaff);
router.get("/", protect, getAllStaff);
router.get("/:id", protect, getStaffById);
router.put("/:id", protect, updateStaff);
router.delete("/:id", protect, deleteStaff);

module.exports = router;

