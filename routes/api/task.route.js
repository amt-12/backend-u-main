const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const {
  createTask,
  getMyTasks,
  getAssignedTasks,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskStats,
  saveSubTaskLink,
  updateSubTaskStatus,
  getEmployeePerformance,
  updateTaskApprovalStatus
} = require("../../controller/Task/taskController");

const router = express.Router();

// All task routes are protected
router.use(protect);

router.post("/", createTask);
router.get("/my-tasks", getMyTasks);
router.get("/assigned-tasks", getAssignedTasks);
router.get("/stats", getTaskStats);
router.get("/employee-performance", getEmployeePerformance);
router.get("/", getAllTasks);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.put("/:id/sub-task-link", saveSubTaskLink);
router.put("/:id/sub-task-status", updateSubTaskStatus);
router.patch("/:id/status", updateTaskStatus);
router.patch("/:id/approval", updateTaskApprovalStatus);
router.delete("/:id", deleteTask);

module.exports = router;
