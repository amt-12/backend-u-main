const Leave = require("../../models/Leave");
const User = require("../../models/Auth/User");
const dayjs = require("dayjs");

// Default leave balances
const DEFAULT_BALANCE = {
  casual: { total: 12, taken: 0, remaining: 12 },
  sick: { total: 12, taken: 0, remaining: 12 },
  paid: { total: 15, taken: 0, remaining: 15 },
};

// Helper: Get user's leave balance for a year
const getUserLeaveBalance = async (staffId, year) => {
  const leaves = await Leave.find({
    staffId,
    year,
    status: { $in: ["approved", "pending"] },
  }).lean();

  const casualTaken = leaves
    .filter((l) => l.leaveType === "casual")
    .reduce((sum, l) => sum + l.totalDays, 0);
  const sickTaken = leaves
    .filter((l) => l.leaveType === "sick")
    .reduce((sum, l) => sum + l.totalDays, 0);
  const paidTaken = leaves
    .filter((l) => l.leaveType === "paid")
    .reduce((sum, l) => sum + l.totalDays, 0);

  return {
    casual: {
      total: DEFAULT_BALANCE.casual.total,
      taken: casualTaken,
      remaining: Math.max(0, DEFAULT_BALANCE.casual.total - casualTaken),
    },
    sick: {
      total: DEFAULT_BALANCE.sick.total,
      taken: sickTaken,
      remaining: Math.max(0, DEFAULT_BALANCE.sick.total - sickTaken),
    },
    paid: {
      total: DEFAULT_BALANCE.paid.total,
      taken: paidTaken,
      remaining: Math.max(0, DEFAULT_BALANCE.paid.total - paidTaken),
    },
  };
};

// Apply for leave
const applyLeave = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const totalDays = end.diff(start, "day") + 1;

    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const year = start.year();
    const balance = await getUserLeaveBalance(staffId, year);

    if (balance[leaveType].remaining < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${leaveType} leave balance. Remaining: ${balance[leaveType].remaining} days`,
      });
    }

    const leave = new Leave({
      staffId,
      leaveType,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      reason,
      year,
      balanceSnapshot: {
        casual: balance.casual.remaining,
        sick: balance.sick.remaining,
        paid: balance.paid.remaining,
      },
    });

    await leave.save();
    await leave.populate("staffId", "name email role");

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ success: false, message: "Server error applying for leave" });
  }
};

// Get My Leave Balance
const getMyLeaveBalance = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const year = parseInt(req.query.year) || dayjs().year();

    const balance = await getUserLeaveBalance(staffId, year);

    res.json({
      success: true,
      data: {
        balance,
        currentYear: year,
      },
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leave balance" });
  }
};

// Get My Leaves
const getMyLeaves = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { status, year = dayjs().year() } = req.query;

    const query = { staffId, year: parseInt(year) };
    if (status && status !== "all") {
      query.status = status;
    }

    const leaves = await Leave.find(query)
      .populate("staffId", "name email role")
      .populate("approvedBy", "name email")
      .sort({ appliedOn: -1 })
      .lean();

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get my leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leaves" });
  }
};

// Cancel Leave
const cancelLeave = async (req, res) => {
  try {
    const staffId = req.user.userId || req.user._id || req.user.id;
    const { id } = req.params;

    const leave = await Leave.findOne({ _id: id, staffId });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Can only cancel pending leave requests",
      });
    }

    leave.status = "cancelled";
    await leave.save();

    res.json({
      success: true,
      message: "Leave request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel leave error:", error);
    res.status(500).json({ success: false, message: "Server error cancelling leave" });
  }
};

// Get Pending Leaves (for approvers)
const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: "pending" })
      .populate("staffId", "name email role")
      .sort({ appliedOn: -1 })
      .lean();

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get pending leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching pending leaves" });
  }
};

// Get All Leaves
const getAllLeaves = async (req, res) => {
  try {
    const { status, leaveType, department, year = dayjs().year(), month } = req.query;

    const query = { year: parseInt(year) };

    if (status && status !== "all") {
      query.status = status;
    }

    if (leaveType) {
      query.leaveType = leaveType;
    }

    let leaves = await Leave.find(query)
      .populate("staffId", "name email role")
      .populate("approvedBy", "name email")
      .sort({ appliedOn: -1 })
      .lean();

    if (department) {
      leaves = leaves.filter((l) => l.staffId?.role === department);
    }

    if (month) {
      leaves = leaves.filter((l) => dayjs(l.startDate).month() + 1 === parseInt(month));
    }

    res.json({
      success: true,
      data: leaves.map(formatLeave),
    });
  } catch (error) {
    console.error("Get all leaves error:", error);
    res.status(500).json({ success: false, message: "Server error fetching all leaves" });
  }
};

// Approve Leave
const approveLeave = async (req, res) => {
  try {
    const approverId = req.user.userId || req.user._id || req.user.id;
    const { id } = req.params;

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Leave request is not pending",
      });
    }

    leave.status = "approved";
    leave.approvedBy = approverId;
    leave.approvedAt = new Date();
    await leave.save();
    await leave.populate("staffId", "name email role");
    await leave.populate("approvedBy", "name email");

    res.json({
      success: true,
      message: "Leave request approved",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ success: false, message: "Server error approving leave" });
  }
};

// Reject Leave
const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Leave request is not pending",
      });
    }

    leave.status = "rejected";
    leave.rejectionReason = reason || "Rejected by admin";
    await leave.save();
    await leave.populate("staffId", "name email role");

    res.json({
      success: true,
      message: "Leave request rejected",
      data: formatLeave(leave),
    });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ success: false, message: "Server error rejecting leave" });
  }
};

// Get Leave Stats
const getLeaveStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();

    const allLeaves = await Leave.find({ year }).lean();

    const stats = {
      total: allLeaves.length,
      pending: allLeaves.filter((l) => l.status === "pending").length,
      approved: allLeaves.filter((l) => l.status === "approved").length,
      rejected: allLeaves.filter((l) => l.status === "rejected").length,
      byType: {
        casual: allLeaves.filter((l) => l.leaveType === "casual").length,
        sick: allLeaves.filter((l) => l.leaveType === "sick").length,
        paid: allLeaves.filter((l) => l.leaveType === "paid").length,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get leave stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching leave stats" });
  }
};

// Helper: Format leave for response
function formatLeave(leave) {
  return {
    _id: leave._id,
    staffId: leave.staffId
      ? {
          _id: leave.staffId._id,
          fullName: leave.staffId.name,
          email: leave.staffId.email,
          department: leave.staffId.role || "General",
          role: leave.staffId.role,
        }
      : null,
    leaveType: leave.leaveType,
    startDate: leave.startDate,
    endDate: leave.endDate,
    totalDays: leave.totalDays,
    reason: leave.reason,
    status: leave.status,
    appliedOn: leave.appliedOn,
    approvedBy: leave.approvedBy
      ? {
          _id: leave.approvedBy._id,
          fullName: leave.approvedBy.name,
          email: leave.approvedBy.email,
        }
      : null,
    approvedAt: leave.approvedAt,
    rejectionReason: leave.rejectionReason,
    balanceSnapshot: leave.balanceSnapshot,
  };
}

module.exports = {
  applyLeave,
  getMyLeaveBalance,
  getMyLeaves,
  cancelLeave,
  getPendingLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  getLeaveStats,
};

