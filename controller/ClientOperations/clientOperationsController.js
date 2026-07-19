const ClientOperations = require("../../models/ClientOperations");
const BrandLead = require("../../models/BrandLead");
const User = require("../../models/Auth/User");

// Get all clients with search and filtering
const getClients = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      // Find BrandLeads matching search
      const matchingLeads = await BrandLead.find({
        $or: [
          { brandName: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { contactPerson: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const leadIds = matchingLeads.map((l) => l._id);
      query.brandLead = { $in: leadIds };
    }

    const clients = await ClientOperations.find(query)
      .populate({
        path: "brandLead",
        populate: {
          path: "assignedTo",
          select: "name email role",
        },
      })
      .populate("accountManager", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ success: false, message: "Server error fetching clients" });
  }
};

// Get single client by ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await ClientOperations.findById(id)
      .populate({
        path: "brandLead",
        populate: {
          path: "assignedTo",
          select: "name email role",
        },
      })
      .populate("accountManager", "name email role")
      .lean();

    if (!client) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ success: false, message: "Server error fetching client" });
  }
};

// Create a new Client Operations profile
const createClient = async (req, res) => {
  try {
    const {
      brandLead: brandLeadId,
      accountManager,
      monthlyPackage,
      servicesIncluded,
      contractStartDate,
      contractEndDate,
      projectStartDate,
      postingFrequency,
      internalNotes,
      status,
    } = req.body;

    if (!brandLeadId || !accountManager || monthlyPackage === undefined || !contractStartDate || !contractEndDate || !projectStartDate) {
      return res.status(400).json({
        success: false,
        message: "Required operational fields (Brand Lead, Account Manager, Monthly Package, Start/End/Project Dates) are missing",
      });
    }

    // Check if brand is already imported
    const existing = await ClientOperations.findOne({ brandLead: brandLeadId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This brand lead is already imported in Client Operations",
      });
    }

    // Verify brand lead exists and is Onboarded
    const brandLead = await BrandLead.findById(brandLeadId);
    if (!brandLead) {
      return res.status(404).json({ success: false, message: "Brand Lead not found" });
    }

    if (brandLead.status !== "onboarded") {
      return res.status(400).json({
        success: false,
        message: "Only brand leads with status 'Onboarded' can be moved to Client Operations",
      });
    }

    // Create Client Operations record
    const client = new ClientOperations({
      brandLead: brandLeadId,
      accountManager,
      monthlyPackage,
      servicesIncluded: servicesIncluded || [],
      contractStartDate: new Date(contractStartDate),
      contractEndDate: new Date(contractEndDate),
      projectStartDate: new Date(projectStartDate),
      postingFrequency: postingFrequency || "",
      internalNotes: internalNotes || "",
      status: status || "active",
    });

    await client.save();

    // Mark BrandLead as moved
    brandLead.status = "moved_to_operations";
    await brandLead.save();

    // Fetch and populate for response
    const populated = await ClientOperations.findById(client._id)
      .populate({
        path: "brandLead",
        populate: {
          path: "assignedTo",
          select: "name email role",
        },
      })
      .populate("accountManager", "name email role");

    res.status(201).json({
      success: true,
      message: "Client operations profile created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ success: false, message: "Server error creating client operations profile" });
  }
};

// Update operational info
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = { ...req.body };

    // Prevent updating read-only links directly
    delete updateFields.brandLead;

    if (updateFields.contractStartDate) updateFields.contractStartDate = new Date(updateFields.contractStartDate);
    if (updateFields.contractEndDate) updateFields.contractEndDate = new Date(updateFields.contractEndDate);
    if (updateFields.projectStartDate) updateFields.projectStartDate = new Date(updateFields.projectStartDate);

    const updated = await ClientOperations.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate({
        path: "brandLead",
        populate: {
          path: "assignedTo",
          select: "name email role",
        },
      })
      .populate("accountManager", "name email role");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    res.json({
      success: true,
      message: "Client operations details updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ success: false, message: "Server error updating client details" });
  }
};

// Delete client profile and restore BrandLead status
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await ClientOperations.findById(id);

    if (!client) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    // Restore BrandLead status to onboarded
    if (client.brandLead) {
      await BrandLead.findByIdAndUpdate(client.brandLead, { status: "onboarded" });
    }

    await ClientOperations.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Client operations profile deleted and brand status restored to 'Onboarded'",
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ success: false, message: "Server error deleting client operations profile" });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
