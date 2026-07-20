const BrandLead = require("../../models/BrandLead");
const User = require("../../models/Auth/User");
const BookCall = require("../../models/BookCall");
const dayjs = require("dayjs");

const updateCategoryDataForOnboarding = (lead, selectedCategory) => {
  if (lead.status !== 'onboarded') return;

  let onboardedCategory = selectedCategory;

  if (!onboardedCategory) {
    const requirements = lead.requirements || [];
    // Determine default based on requirements
    for (const req of requirements) {
      const l = req.toLowerCase().trim();
      if (l.includes('website') || l.includes('web') || l.includes('deelopemnt') || l.includes('develop')) {
        onboardedCategory = 'website_development';
        break;
      } else if (l.includes('reels') || l.includes('tiktok') || l.includes('short form') || l.includes('shoot') || l.includes('production')) {
        onboardedCategory = 'ad_production';
        break;
      } else if (l.includes('digital') || l.includes('digi') || l.includes('digtal') || l.includes('marketing') || l.includes('ads') || l.includes('seo') || l.includes('branding') || l.includes('influencer') || l.includes('copywriting') || l.includes('content')) {
        onboardedCategory = 'digital_marketing';
        break;
      }
    }
  }

  if (!onboardedCategory) {
    onboardedCategory = 'digital_marketing';
  }

  // Update categoryData for ONLY the selected onboarded category
  if (!lead.categoryData) {
    lead.categoryData = new Map();
  }

  const current = lead.categoryData.get ? lead.categoryData.get(onboardedCategory) : lead.categoryData[onboardedCategory];
  const currentObj = current && typeof current.toObject === 'function' ? current.toObject() : current;
  
  try {
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(
      path.join(__dirname, '../../scratch/debug.log'),
      `In updateCategoryDataForOnboarding:\nonboardedCategory: ${onboardedCategory}\ncurrentObj: ${JSON.stringify(currentObj)}\ntop-level finalDealValue: ${lead.finalDealValue}\ntop-level dealValue: ${lead.dealValue}\n`
    );
  } catch (e) {}

  const updatedCat = { 
    ...(currentObj || {}), 
    status: 'onboarded',
    estimatedDealValue: (currentObj && currentObj.estimatedDealValue !== undefined && currentObj.estimatedDealValue !== 0) ? currentObj.estimatedDealValue : (lead.estimatedDealValue || lead.dealValue || 0),
    finalDealValue: (currentObj && currentObj.finalDealValue !== undefined && currentObj.finalDealValue !== 0) ? currentObj.finalDealValue : (lead.finalDealValue || lead.dealValue || 0),
    assignedTo: (currentObj && currentObj.assignedTo) ? currentObj.assignedTo : (lead.assignedTo || null)
  };
  
  try {
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(
      path.join(__dirname, '../../scratch/debug.log'),
      `updatedCat calculated: ${JSON.stringify(updatedCat)}\n`
    );
  } catch (e) {}

  if (lead.categoryData.set) {
    lead.categoryData.set(onboardedCategory, updatedCat);
  } else {
    lead.categoryData[onboardedCategory] = updatedCat;
  }
  lead.markModified('categoryData');

  // Set onboardedDates
  if (!lead.onboardedDates) {
    lead.onboardedDates = [];
  }
  if (lead.onboardedDates.length === 0) {
    lead.onboardedDates.push(new Date());
  }

  // Set top-level assignedTo if not set
  if (!lead.assignedTo && updatedCat.assignedTo) {
    lead.assignedTo = updatedCat.assignedTo;
  }

  // Now, calculate if all required categories are onboarded
  const requirements = lead.requirements || [];
  const requiredCategories = [];
  requirements.forEach(req => {
    const l = req.toLowerCase().trim();
    if (l.includes('website') || l.includes('web') || l.includes('deelopemnt') || l.includes('develop')) {
      if (!requiredCategories.includes('website_development')) {
        requiredCategories.push('website_development');
      }
    } else if (l.includes('reels') || l.includes('tiktok') || l.includes('short form') || l.includes('shoot') || l.includes('production')) {
      if (!requiredCategories.includes('ad_production')) {
        requiredCategories.push('ad_production');
      }
    } else if (l.includes('digital') || l.includes('digi') || l.includes('digtal') || l.includes('marketing') || l.includes('ads') || l.includes('seo') || l.includes('branding') || l.includes('influencer') || l.includes('copywriting') || l.includes('content')) {
      if (!requiredCategories.includes('digital_marketing')) {
        requiredCategories.push('digital_marketing');
      }
    }
  });

  if (requiredCategories.length === 0) {
    requiredCategories.push('digital_marketing');
  }

  const anyOnboarded = requiredCategories.some(cat => {
    const catData = lead.categoryData ? (lead.categoryData.get ? lead.categoryData.get(cat) : lead.categoryData[cat]) : null;
    return catData && (catData.status === 'onboarded' || catData.status === 'moved_to_operations');
  }) || (selectedCategory && (
    (lead.categoryData?.get ? lead.categoryData.get(selectedCategory)?.status === 'onboarded' : lead.categoryData?.[selectedCategory]?.status === 'onboarded') ||
    (lead.categoryData?.get ? lead.categoryData.get(selectedCategory)?.status === 'moved_to_operations' : lead.categoryData?.[selectedCategory]?.status === 'moved_to_operations')
  ));

  if (anyOnboarded) {
    lead.status = 'onboarded';
  } else {
    lead.status = 'pending';
  }

  // Calculate total deal value from all onboarded categories
  let totalDealValue = 0;
  for (const cat of ['digital_marketing', 'website_development', 'ad_production']) {
    const catData = lead.categoryData ? (lead.categoryData.get ? lead.categoryData.get(cat) : lead.categoryData[cat]) : null;
    if (catData && (catData.status === 'onboarded' || catData.status === 'moved_to_operations')) {
      totalDealValue += (catData.finalDealValue || 0);
    }
  }
  lead.dealValue = totalDealValue;
};

// Get all brand leads with filtering and search
const getAllBrandLeads = async (req, res) => {
  try {
    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

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
      .populate("assignedTo", "name email role designation")
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
    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

    const { id } = req.params;
    const lead = await BrandLead.findById(id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role designation")
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
    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

    const {
      brandName,
      companyName,
      contactPerson,
      email,
      phone,
      website,
      status,
      dealValue,
      estimatedDealValue,
      finalDealValue,
      source,
      notes,
      followUpDate,
      assignedTo,
      instagram,
      whatsAppGroupLink,
      requirements,
      budget,
      brandDescription,
      deliverables,
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
      estimatedDealValue: estimatedDealValue || 0,
      finalDealValue: finalDealValue || 0,
      source: source || "Other",
      notes: notes || "",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      createdBy: createdById,
      assignedTo: assignedTo || null,
      instagram: instagram || "",
      whatsAppGroupLink: whatsAppGroupLink || "",
      requirements: requirements || [],
      budget: budget || "",
      brandDescription: brandDescription || "",
      deliverables: deliverables || {
        branding: { checked: false, count: 0 },
        ugc: { checked: false, count: 0 },
        reels: { checked: false, count: 0 },
        posts: { checked: false, count: 0 }
      },
      followUps: [],
    });

    if (newLead.status === 'onboarded') {
      updateCategoryDataForOnboarding(newLead, req.body.category);
    }

    await newLead.save();

    const populatedLead = await BrandLead.findById(newLead._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role designation");

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
    const { id } = req.params;
    const updateFields = { ...req.body };
    
    // Log request
    try {
      const fs = require('fs');
      const path = require('path');
      fs.appendFileSync(
        path.join(__dirname, '../../scratch/debug.log'),
        `\n[${new Date().toISOString()}] UPDATE START\nID: ${id}\nBody: ${JSON.stringify(req.body)}\n`
      );
    } catch (e) {}

    const category = updateFields.category;
    delete updateFields.category;

    // Remove immutable fields or ones handled separately
    delete updateFields.createdBy;
    delete updateFields.followUps;

    if (updateFields.followUpDate) {
      updateFields.followUpDate = new Date(updateFields.followUpDate);
    }

    const lead = await BrandLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    const isOnboarding = updateFields.status === 'onboarded';

    // Apply category-specific updates if category is provided
    if (category) {
      const categorySpecificFields = ['estimatedDealValue', 'finalDealValue', 'assignedTo', 'status', 'followUpDate'];
      if (!lead.categoryData) lead.categoryData = new Map();
      
      const current = lead.categoryData.get ? lead.categoryData.get(category) : lead.categoryData[category];
      const currentObj = current && typeof current.toObject === 'function' ? current.toObject() : current;
      const catUpdate = { ...(currentObj || {}) };
      for (const field of categorySpecificFields) {
        if (updateFields[field] !== undefined) {
          catUpdate[field] = updateFields[field];
        }
      }
      
      if (lead.categoryData.set) {
        lead.categoryData.set(category, catUpdate);
      } else {
        lead.categoryData[category] = catUpdate;
      }
      lead.markModified('categoryData');

      try {
        const fs = require('fs');
        const path = require('path');
        fs.appendFileSync(
          path.join(__dirname, '../../scratch/debug.log'),
          `After category block set, in-memory Map: ${JSON.stringify(lead.categoryData.get(category))}\n`
        );
      } catch (e) {}

      // Remove category fields from top-level update fields
      for (const field of categorySpecificFields) {
        delete updateFields[field];
      }
    }

    // Apply remaining top-level fields
    Object.assign(lead, updateFields);

    if (isOnboarding) {
      lead.status = 'onboarded';
    }

    // If onboarding, update categoryData for the selected category
    if (lead.status === 'onboarded') {
      updateCategoryDataForOnboarding(lead, category);
    }

    await lead.save();

    const populatedLead = await BrandLead.findById(lead._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role designation")
      .populate("followUps.by", "name email");

    res.json({
      success: true,
      message: "Brand lead updated successfully",
      data: populatedLead,
    });

  } catch (error) {
    console.error("Update brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error updating brand lead" });
  }
};

// Delete brand lead
const deleteBrandLead = async (req, res) => {
  try {
    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

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
    // if (!["admin", "hr"].includes(req.user.role)) {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

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
      .populate("assignedTo", "name email role designation")
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
    let lead = await BrandLead.findById(id)
      .select("brandName companyName contactPerson email phone website instagram requirements budget brandDescription clientSubmitted")
      .lean();

    if (!lead) {
      const bookCall = await BookCall.findById(id).lean();
      if (bookCall) {
        lead = {
          _id: bookCall._id,
          brandName: bookCall.brandName || (bookCall.name ? `${bookCall.name}'s Brand` : ""),
          companyName: bookCall.companyName || "",
          contactPerson: bookCall.contactPerson || bookCall.name || "",
          email: bookCall.email || "",
          phone: bookCall.phone || "",
          website: bookCall.website || "",
          instagram: bookCall.instagram || "",
          requirements: bookCall.tags || [],
          budget: bookCall.budget || "",
          brandDescription: bookCall.brandDescription || bookCall.description || "",
          clientSubmitted: false, // Assuming they haven't submitted yet
        };
      }
    }

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

    let lead = await BrandLead.findById(id);
    let isBookCall = false;

    if (!lead) {
      lead = await BookCall.findById(id);
      if (lead) isBookCall = true;
    }

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
    if (requirements !== undefined) {
      if (isBookCall) {
        lead.tags = requirements; // Map to tags for BookCall
      } else {
        lead.requirements = requirements;
      }
    }
    if (budget !== undefined) lead.budget = budget;
    if (brandDescription !== undefined) lead.brandDescription = brandDescription;

    if (!isBookCall) {
      lead.clientSubmitted = true;
      lead.status = "negotiation"; // Progress status to negotiation when client submits form
    }

    // Add a system follow-up action to record client submission
    if (!lead.followUps) lead.followUps = [];
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
        brandName: lead.brandName || lead.name,
        clientSubmitted: isBookCall ? true : lead.clientSubmitted,
      },
    });
  } catch (error) {
    console.error("Submit client brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error submitting onboarding details" });
  }
};

// Re-onboard a brand lead
const reOnboardBrandLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, dealValue, requirements, assignedTo } = req.body;

    const lead = await BrandLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Brand lead not found" });
    }

    if (!lead.onboardedDates) {
      lead.onboardedDates = [];
    }

    // Add original createdAt to the array if it's empty, to preserve history
    if (lead.onboardedDates.length === 0 && lead.status === 'onboarded') {
      lead.onboardedDates.push(lead.createdAt);
    }

    const reOnboardDate = date ? new Date(date) : new Date();
    lead.onboardedDates.push(reOnboardDate);

    // Update new fields if provided
    if (dealValue !== undefined) lead.dealValue = dealValue;
    if (requirements !== undefined) lead.requirements = requirements;
    if (assignedTo !== undefined) lead.assignedTo = assignedTo || null;
    
    // Ensure status is onboarded just in case
    lead.status = 'onboarded';

    await lead.save();

    res.json({
      success: true,
      message: "Client re-onboarded successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Re-onboard brand lead error:", error);
    res.status(500).json({ success: false, message: "Server error re-onboarding brand lead" });
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
  reOnboardBrandLead,
};
