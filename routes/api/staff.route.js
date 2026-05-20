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
  getDepartments,
  addDepartment,
} = require("../../controller/Staff/staffController");

router.get("/stats", protect, getStaffStats);
router.get("/departments", protect, getDepartments);
router.post("/departments", protect, addDepartment);
router.post("/", protect, addStaff);
router.get("/", protect, getAllStaff);
router.get("/:id", protect, getStaffById);
router.put("/:id", protect, updateStaff);
router.delete("/:id", protect, deleteStaff);

module.exports = router;

