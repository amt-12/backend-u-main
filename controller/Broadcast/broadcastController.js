const Broadcast = require("../../models/Broadcast");

// Helper to get broadcast statuses
const getStatusQueries = (now) => ({
  active: {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  },
  expired: {
    $or: [
      { isActive: false },
      { endDate: { $lt: now } }
    ]
  },
  scheduled: {
    isActive: true,
    startDate: { $gt: now }
  }
});

// Admin/Manager: Get all broadcasts with pagination & filters
const getAllBroadcasts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, type, status } = req.query;
    const now = new Date();
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } }
      ];
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Status filter (active, expired, scheduled)
    if (status) {
      const statusQueries = getStatusQueries(now);
      if (statusQueries[status]) {
        query = { ...query, ...statusQueries[status] };
      }
    }

    const total = await Broadcast.countDocuments(query);
    const broadcasts = await Broadcast.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: broadcasts,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    console.error("Get all broadcasts error:", error);
    res.status(500).json({ success: false, message: "Server error fetching broadcasts" });
  }
};

// Get currently active broadcasts (visible to banner/banner alert)
const getActiveBroadcasts = async (req, res) => {
  try {
    const now = new Date();
    const activeQuery = getStatusQueries(now).active;
    
    const broadcasts = await Broadcast.find(activeQuery)
      .sort({ startDate: -1 })
      .lean();

    res.json({ success: true, data: broadcasts });
  } catch (error) {
    console.error("Get active broadcasts error:", error);
    res.status(500).json({ success: false, message: "Server error fetching active broadcasts" });
  }
};

// Admin: Get stats overview for broadcasts
const getBroadcastStats = async (req, res) => {
  try {
    const now = new Date();
    const statusQueries = getStatusQueries(now);

    const [total, active, expired, scheduled] = await Promise.all([
      Broadcast.countDocuments({}),
      Broadcast.countDocuments(statusQueries.active),
      Broadcast.countDocuments(statusQueries.expired),
      Broadcast.countDocuments(statusQueries.scheduled)
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expired,
        scheduled
      }
    });
  } catch (error) {
    console.error("Get broadcast stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching broadcast stats" });
  }
};

// Admin: Create new broadcast
const createBroadcast = async (req, res) => {
  try {
    const { title, message, type, priority, startDate, endDate, targetAudience, createdBy, createdByName, createdByRole } = req.body;

    if (!title || !message || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const newBroadcast = new Broadcast({
      title,
      message,
      type: type || "announcement",
      priority: priority || "normal",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetAudience: targetAudience || "all",
      createdBy: createdBy || req.user.userId || req.user._id,
      createdByName: createdByName || req.user.fullName || req.user.name || "Unknown",
      createdByRole: createdByRole || req.user.role || "Staff"
    });

    await newBroadcast.save();

    // Socket.IO Emit
    if (global.io) {
      global.io.emit("newBroadcast", newBroadcast);
    }

    res.status(201).json({ success: true, data: newBroadcast });
  } catch (error) {
    console.error("Create broadcast error:", error);
    res.status(500).json({ success: false, message: "Server error creating broadcast" });
  }
};

// Admin: Update a broadcast
const updateBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, priority, startDate, endDate, targetAudience, isActive } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (message !== undefined) updateFields.message = message;
    if (type !== undefined) updateFields.type = type;
    if (priority !== undefined) updateFields.priority = priority;
    if (startDate !== undefined) updateFields.startDate = new Date(startDate);
    if (endDate !== undefined) updateFields.endDate = new Date(endDate);
    if (targetAudience !== undefined) updateFields.targetAudience = targetAudience;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const broadcast = await Broadcast.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!broadcast) {
      return res.status(404).json({ success: false, message: "Broadcast not found" });
    }

    // Socket.IO Emit
    if (global.io) {
      global.io.emit("broadcastUpdated", broadcast);
    }

    res.json({ success: true, data: broadcast });
  } catch (error) {
    console.error("Update broadcast error:", error);
    res.status(500).json({ success: false, message: "Server error updating broadcast" });
  }
};

// Admin: Delete a broadcast
const deleteBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findByIdAndDelete(id);

    if (!broadcast) {
      return res.status(404).json({ success: false, message: "Broadcast not found" });
    }

    // Socket.IO Emit
    if (global.io) {
      global.io.emit("broadcastDeleted", { broadcastId: id });
    }

    res.json({ success: true, message: "Broadcast deleted successfully" });
  } catch (error) {
    console.error("Delete broadcast error:", error);
    res.status(500).json({ success: false, message: "Server error deleting broadcast" });
  }
};

module.exports = {
  getAllBroadcasts,
  getActiveBroadcasts,
  getBroadcastStats,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast
};
