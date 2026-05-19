const BrandLead = require("../../models/BrandLead");
const User = require("../../models/Auth/User");
const dayjs = require("dayjs");

// Get all brand leads with filtering and search
const getAllBrandLeads = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { status, search, assignedTo } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = assignedTo;
    }

    if (search) {
      query.$or = [
        { brandName: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await BrandLead.find(query)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("followUps.by", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    console.error("Get all brand leads error:", error);
    res.status(500).json({ success: false, message: "Server error fetching brand leads" });
  }
};

// Get single brand lead by ID
const getBrandLeadById = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const lead = await BrandLead.findById(id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("followUps.by", "name email")
      .lean();

    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error fetching brand lead" });
  }
};

// Create a new brand lead
const createBrandLead = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const {
      brandName,
      companyName,
      contactPerson,
      email,
      phone,
      website,
      status,
      dealValue,
      source,
      notes,
      followUpDate,
      assignedTo,
    } = req.body;

    if (!brandName || !contactPerson) {
      return res.status(400).json({
        success: false,
        message: "Brand name and Contact person are required",
      });
    }

    const createdById = req.user.userId || req.user._id || req.user.id;

    const newLead = new BrandLead({
      brandName,
      companyName: companyName || "",
      contactPerson,
      email: email || "",
      phone: phone || "",
      website: website || "",
      status: status || "new",
      dealValue: dealValue || 0,
      source: source || "Other",
      notes: notes || "",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      createdBy: createdById,
      assignedTo: assignedTo || null,
      followUps: [],
    });

    await newLead.save();

    const populatedLead = await BrandLead.findById(newLead._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role");

    res.status(201).json({
      success: true,
      message: "Brand lead created successfully",
      data: populatedLead,
    });
  } catch (error) {
    console.error("Create brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error creating brand lead" });
  }
};

// Update an existing brand lead
const updateBrandLead = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const updateFields = req.body;

    // Remove immutable fields or ones handled separately
    delete updateFields.createdBy;
    delete updateFields.followUps;

    if (updateFields.followUpDate) {
      updateFields.followUpDate = new Date(updateFields.followUpDate);
    }

    const updatedLead = await BrandLead.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("followUps.by", "name email");

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    res.json({
      success: true,
      message: "Brand lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Update brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error updating brand lead" });
  }
};

// Delete brand lead
const deleteBrandLead = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const deletedLead = await BrandLead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    res.json({
      success: true,
      message: "Brand lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error deleting brand lead" });
  }
};

// Add a follow-up log to a brand lead
const addFollowUp = async (req, res) => {
  try {
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const { notes, nextFollowUpDate, status } = req.body;

    if (!notes) {
      return res.status(400).json({ success: false, message: "Follow-up notes are required" });
    }

    const lead = await BrandLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    // Append follow-up
    lead.followUps.push({
      date: new Date(),
      notes,
      status: status || "completed",
      by: userId,
    });

    // Optionally update next follow up date
    if (nextFollowUpDate) {
      lead.followUpDate = new Date(nextFollowUpDate);
    }

    await lead.save();

    const updatedLead = await BrandLead.findById(id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("followUps.by", "name email");

    res.json({
      success: true,
      message: "Follow-up added successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Add follow-up error:", error);
    res.status(500).json({ success: false, message: "Server error adding follow-up" });
  }
};

// Get brand lead details publicly (no auth)
const getClientBrandLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await BrandLead.findById(id)
      .select("brandName companyName contactPerson email phone website instagram requirements budget brandDescription clientSubmitted")
      .lean();

    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand onboarding session not found" });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get client brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error fetching onboarding details" });
  }
};

// Client submits onboarding information (no auth)
const submitClientBrandLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      contactPerson,
      email,
      phone,
      website,
      instagram,
      requirements,
      budget,
      brandDescription,
    } = req.body;

    const lead = await BrandLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand onboarding session not found" });
    }

    // Update details
    if (companyName !== undefined) lead.companyName = companyName;
    if (contactPerson !== undefined) lead.contactPerson = contactPerson;
    if (email !== undefined) lead.email = email;
    if (phone !== undefined) lead.phone = phone;
    if (website !== undefined) lead.website = website;
    if (instagram !== undefined) lead.instagram = instagram;
    if (requirements !== undefined) lead.requirements = requirements;
    if (budget !== undefined) lead.budget = budget;
    if (brandDescription !== undefined) lead.brandDescription = brandDescription;

    lead.clientSubmitted = true;
    lead.status = "negotiation"; // Progress status to negotiation when client submits form

    // Add a system follow-up action to record client submission
    lead.followUps.push({
      date: new Date(),
      notes: `System Info: Client submitted onboarding form. Instagram: "${instagram || 'N/A'}", Budget: ₹${(budget || 0).toLocaleString('en-IN')}, Requirements: "${requirements || 'N/A'}"`,
      status: "completed",
    });

    await lead.save();

    res.json({
      success: true,
      message: "Information submitted successfully",
      data: {
        brandName: lead.brandName,
        clientSubmitted: lead.clientSubmitted,
      },
    });
  } catch (error) {
    console.error("Submit client brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error submitting onboarding details" });
  }
};

module.exports = {
  getAllBrandLeads,
  getBrandLeadById,
  createBrandLead,
  updateBrandLead,
  deleteBrandLead,
  addFollowUp,
  getClientBrandLead,
  submitClientBrandLead,
};
