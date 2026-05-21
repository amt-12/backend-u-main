const Credential = require("../../models/Credential");
const User = require("../../models/Auth/User");
const { sendEmail } = require("../../services/emailService");

// Get all credentials (passwords masked as "••••••••" for safety)
const getAllCredentials = async (req, res) => {
  try {
    if (!["admin", "super_admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { search, platform } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { brandName: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
        { "accounts.username": { $regex: search, $options: "i" } },
      ];
    }

    if (platform && platform !== "all") {
      query["accounts.platform"] = platform;
    }

    // Retrieve all credentials from DB
    const credentials = await Credential.find(query)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    // Mask passwords for safety during list fetches
    const safeCredentials = credentials.map((cred) => ({
      ...cred,
      accounts: (cred.accounts || []).map((acc) => ({
        ...acc,
        password: "••••••••", // return masked password
      })),
    }));

    res.json({
      success: true,
      data: safeCredentials,
    });
  } catch (error) {
    console.error("Get all credentials error:", error);
    res.status(500).json({ success: false, message: "Server error fetching credentials" });
  }
};

// Create a new credential entry (containing multiple accounts)
const createCredential = async (req, res) => {
  try {
    if (!["admin", "super_admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { clientName, brandName, projectName, accounts } = req.body;

    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: "Client Name is required",
      });
    }

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one platform account login is required",
      });
    }

    // Validate account details
    for (const acc of accounts) {
      if (!acc.platform || !acc.username || !acc.password) {
        return res.status(400).json({
          success: false,
          message: "Platform, Username, and Password are required for each account",
        });
      }
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    const newCredential = new Credential({
      clientName,
      brandName: brandName || "",
      projectName: projectName || "",
      accounts: accounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        password: acc.password,
        notes: acc.notes || ""
      })),
      createdBy: userId,
      updatedBy: userId,
    });

    await newCredential.save();

    const populatedCred = await Credential.findById(newCredential._id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    // Mask passwords in response
    const safeCred = populatedCred.toObject();
    safeCred.accounts = safeCred.accounts.map(acc => ({
      ...acc,
      password: "••••••••"
    }));

    res.status(201).json({
      success: true,
      message: "Credentials created successfully",
      data: safeCred,
    });
  } catch (error) {
    console.error("Create credential error:", error);
    res.status(500).json({ success: false, message: "Server error creating credentials" });
  }
};

// Update credential details (handles nested accounts updates)
const updateCredential = async (req, res) => {
  try {
    if (!["admin", "super_admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const { clientName, brandName, projectName, accounts } = req.body;

    if (!clientName) {
      return res.status(400).json({
        success: false,
        message: "Client Name is required",
      });
    }

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one platform account is required",
      });
    }

    const existingCred = await Credential.findById(id);
    if (!existingCred) {
      return res.status(404).json({ success: false, message: "Credential entry not found" });
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    // Map updated accounts, preserving password if it was sent as masked "••••••••"
    const updatedAccounts = accounts.map(acc => {
      const newAcc = {
        platform: acc.platform,
        username: acc.username,
        notes: acc.notes || ""
      };

      // If it has an ID, look up the existing account password if it hasn't been edited
      if (acc._id) {
        newAcc._id = acc._id;
        const matchedOld = existingCred.accounts.id(acc._id);
        if (matchedOld) {
          if (acc.password === "••••••••" || !acc.password) {
            newAcc.password = matchedOld.password;
          } else {
            newAcc.password = acc.password;
          }
        } else {
          newAcc.password = acc.password;
        }
      } else {
        // New account inside existing client entry
        newAcc.password = acc.password;
      }

      return newAcc;
    });

    const updatedCred = await Credential.findByIdAndUpdate(
      id,
      {
        $set: {
          clientName,
          brandName: brandName || "",
          projectName: projectName || "",
          accounts: updatedAccounts,
          updatedBy: userId
        }
      },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    const safeCred = updatedCred.toObject();
    safeCred.accounts = safeCred.accounts.map(acc => ({
      ...acc,
      password: "••••••••"
    }));

    res.json({
      success: true,
      message: "Credentials updated successfully",
      data: safeCred,
    });
  } catch (error) {
    console.error("Update credential error:", error);
    res.status(500).json({ success: false, message: "Server error updating credentials" });
  }
};

// Delete an entire credential entry
const deleteCredential = async (req, res) => {
  try {
    if (!["admin", "super_admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const deletedCred = await Credential.findByIdAndDelete(id);

    if (!deletedCred) {
      return res.status(404).json({ success: false, message: "Credential not found" });
    }

    res.json({
      success: true,
      message: "Credential entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete credential error:", error);
    res.status(500).json({ success: false, message: "Server error deleting credential" });
  }
};

// Reveal unmasked password for a specific nested account & notify admins
const revealPassword = async (req, res) => {
  try {
    if (!["admin", "super_admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id, accountId } = req.params;
    const credential = await Credential.findById(id);

    if (!credential) {
      return res.status(404).json({ success: false, message: "Credential entry not found" });
    }

    const account = credential.accounts.id(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account credentials not found" });
    }

    // Immediately respond to the user with the actual password to avoid waiting
    res.json({
      success: true,
      password: account.password,
    });

    // Run the email notification asynchronously without blocking the response
    (async () => {
      try {
        // Fetch requester profile details
        const requesterId = req.user.userId || req.user._id || req.user.id;
        const requesterObj = await User.findById(requesterId).lean();
        const requesterName = requesterObj ? requesterObj.name : "Admin/HR User";
        const requesterEmail = requesterObj ? requesterObj.email : (req.user.email || "Unknown");

        // Fetch all users with admin or super_admin role in DB
        const admins = await User.find({ role: { $in: ["admin", "super_admin"] } }).lean();
        const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

        // Fallback email if no DB admins found
        const toEmails = adminEmails.length > 0 ? adminEmails : [process.env.SMTP_EMAIL || "amrit0207232@gmail.com"];

        const subject = `⚠️ Secure Alert: Credentials Viewed by ${requesterName}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Security Audit Log</h2>
              <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.8;">Client Credentials Accessed</p>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
                Hello Admin,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
                A request was made to view the password/credentials of an onboarded client brand. Here are the audit details:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px; text-align: left; font-size: 13px; font-weight: bold; color: #1e293b; width: 40%;">Detail Field</th>
                    <th style="padding: 10px; text-align: left; font-size: 13px; font-weight: bold; color: #1e293b; width: 60%;">Logged Information</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Accessed By</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;">${requesterName} (Role: ${req.user.role})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Requester Email</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;">${requesterEmail}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Client / Brand Name</td>
                    <td style="padding: 10px; font-size: 14px; color: #1e3a8a; font-weight: bold;">${credential.clientName} ${credential.brandName ? `(${credential.brandName})` : ''}</td>
                  </tr>
                  ${credential.projectName ? `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Project Name</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;">${credential.projectName}</td>
                  </tr>` : ''}
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Platform / Service</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;">
                      <span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        ${account.platform.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Username / Login</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;"><code>${account.username}</code></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-size: 14px; font-weight: bold; color: #475569;">Access Time (IST)</td>
                    <td style="padding: 10px; font-size: 14px; color: #334155;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                  </tr>
                </tbody>
              </table>
              
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: bold;">
                  ⚠️ Security Notice:
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #b45309;">
                  If this action was unexpected or unauthorized, please change the client's platform password immediately and audit recent activity logs.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              This is an automated security audit email generated by the Unreal Studioz LMS Portal.
            </div>
          </div>
        `;

        for (const email of toEmails) {
          await sendEmail(email, subject, { message: emailHtml });
        }
      } catch (err) {
        console.error("Error sending credentials view alert email:", err);
      }
    })();
  } catch (error) {
    console.error("Reveal password error:", error);
    res.status(500).json({ success: false, message: "Server error revealing password" });
  }
};

module.exports = {
  getAllCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  revealPassword,
};

