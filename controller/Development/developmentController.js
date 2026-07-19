const Development = require("../../models/Development");
const User = require("../../models/Auth/User");

// Get personal development trainings/objectives
const getMyTrainings = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const trainings = await Development.find({ staff: userId })
      .sort({ targetDate: 1 })
      .lean();

    res.json({ success: true, data: trainings });
  } catch (error) {
    console.error("Get my trainings error:", error);
    res.status(500).json({ success: false, message: "Server error fetching trainings" });
  }
};

// Update training progress (completed hours, percent progress, status)
const updateProgress = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { progress, hoursCompleted, status } = req.body;

    const updateFields = {};
    if (progress !== undefined) updateFields.progress = progress;
    if (hoursCompleted !== undefined) updateFields.hoursCompleted = hoursCompleted;
    if (status !== undefined) updateFields.status = status;

    const training = await Development.findByIdAndUpdate(
      trainingId,
      { $set: updateFields },
      { new: true }
    );

    if (!training) {
      return res.status(404).json({ success: false, message: "Objective not found" });
    }

    res.json({ success: true, data: training });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({ success: false, message: "Server error updating progress" });
  }
};

// Admin: Assign development objective to staff
const assignDevelopment = async (req, res) => {
  try {
    const { staffId, title, description, category, targetDate, hoursEstimated, priority } = req.body;

    if (!staffId || !title || !targetDate) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const newObjective = new Development({
      staff: staffId,
      title,
      description: description || "",
      category,
      targetDate: new Date(targetDate),
      hoursEstimated: hoursEstimated || 0,
      priority: priority || "medium",
      progress: 0,
      status: "pending"
    });

    await newObjective.save();

    res.status(201).json({ success: true, data: newObjective });
  } catch (error) {
    console.error("Assign development error:", error);
    res.status(500).json({ success: false, message: "Server error assigning development objective" });
  }
};

// Admin/Manager: Get all staff development trainings
const getAllStaffTrainings = async (req, res) => {
  try {
    const trainings = await Development.find()
      .populate("staff", "name email department designation")
      .sort({ createdAt: -1 })
      .lean();

    // Map _id to id or map User schema fields to whatever frontend expects
    const formattedData = trainings.map(item => ({
      ...item,
      staff: item.staff ? {
        _id: item.staff._id,
        fullName: item.staff.name,
        email: item.staff.email,
        department: item.staff.department,
        designation: item.staff.designation
      } : null
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Get all staff trainings error:", error);
    res.status(500).json({ success: false, message: "Server error fetching all trainings" });
  }
};

module.exports = {
  getMyTrainings,
  updateProgress,
  assignDevelopment,
  getAllStaffTrainings
};
