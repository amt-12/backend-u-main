const ScheduledPost = require("../../models/ScheduledPost");
const BrandLead = require("../../models/BrandLead");

// Create a new scheduled post
const createScheduledPost = async (req, res) => {
  try {
    const { brandLead, title, type, scheduledDate, caption, status, mediaUrl } = req.body;

    if (!brandLead || !title || !type || !scheduledDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify brand lead exists and is onboarded
    const brand = await BrandLead.findById(brandLead);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand/Client not found" });
    }

    const newPost = new ScheduledPost({
      brandLead,
      title,
      type,
      scheduledDate,
      caption,
      status,
      mediaUrl,
      createdBy: req.user.userId || req.user._id || req.user.id,
    });

    await newPost.save();

    const populatedPost = await ScheduledPost.findById(newPost._id)
      .populate("brandLead", "brandName companyName contactPerson")
      .populate("createdBy", "name email role");

    res.status(201).json({
      success: true,
      data: populatedPost,
    });
  } catch (error) {
    console.error("Create scheduled post error:", error);
    res.status(500).json({ success: false, message: "Server error creating scheduled post" });
  }
};

// Get all scheduled posts with optional filtering
const getAllScheduledPosts = async (req, res) => {
  try {
    const { brandLead, status, type, startDate, endDate } = req.query;
    const query = {};

    if (brandLead) {
      query.brandLead = brandLead;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) {
        query.scheduledDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scheduledDate.$lte = new Date(endDate);
      }
    }

    const posts = await ScheduledPost.find(query)
      .populate("brandLead", "brandName companyName contactPerson deliverables")
      .populate("createdBy", "name email role")
      .sort({ scheduledDate: 1 })
      .lean();

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Get scheduled posts error:", error);
    res.status(500).json({ success: false, message: "Server error fetching scheduled posts" });
  }
};

// Update an existing scheduled post
const updateScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const post = await ScheduledPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Scheduled post not found" });
    }

    // Update fields
    const allowedUpdates = ["title", "type", "scheduledDate", "caption", "status", "mediaUrl"];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        post[field] = updates[field];
      }
    });

    await post.save();

    const updatedPost = await ScheduledPost.findById(post._id)
      .populate("brandLead", "brandName companyName contactPerson")
      .populate("createdBy", "name email role");

    res.json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    console.error("Update scheduled post error:", error);
    res.status(500).json({ success: false, message: "Server error updating scheduled post" });
  }
};

// Delete a scheduled post
const deleteScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ScheduledPost.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Scheduled post not found" });
    }

    res.json({
      success: true,
      message: "Scheduled post deleted successfully",
    });
  } catch (error) {
    console.error("Delete scheduled post error:", error);
    res.status(500).json({ success: false, message: "Server error deleting scheduled post" });
  }
};

module.exports = {
  createScheduledPost,
  getAllScheduledPosts,
  updateScheduledPost,
  deleteScheduledPost,
};
