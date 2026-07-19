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
  deleteDepartment,
  getStaffForDropdown,
} = require("../../controller/Staff/staffController");

const taskRoutes = require("./task.route");

router.get("/stats", protect, getStaffStats);
router.get("/departments", protect, getDepartments);
router.post("/departments", protect, addDepartment);
router.delete("/departments/:name", protect, deleteDepartment);
router.get("/dropdown", protect, getStaffForDropdown);
router.use("/tasks", taskRoutes);

router.post("/", protect, addStaff);
router.get("/", protect, getAllStaff);
router.get("/:id", protect, getStaffById);
router.put("/:id", protect, updateStaff);
router.delete("/:id", protect, deleteStaff);

module.exports = router;

