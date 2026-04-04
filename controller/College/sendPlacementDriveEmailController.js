const College = require('../../models/College');
const { sendEmail } = require('../../services/emailService');

const sendPlacementDriveEmail = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { id } = req.params;
    const { technologies, educationPrograms } = req.body;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    }

    if (!college.contact?.email && !college.poc?.email) {
      return res.status(400).json({ success: false, error: 'No email found for college' });
    }

    // Update status and defaults for placement drive
    college.inviteStatus = 'pending';
    college.placementDriveDate = new Date();
    college.placementDriveEmailSent = true;
    
    if (technologies && Array.isArray(technologies)) {
      college.technologies = technologies.map(t => ({ name: t }));
    }
    if (educationPrograms && Array.isArray(educationPrograms)) {
      college.educationPrograms = educationPrograms.map(p => ({ name: p }));
    }

    await college.save();

    const emailTo = college.contact?.email || college.poc?.email;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/placement-drive/${college._id}`; // Use ID instead of token for simplicity

    await sendEmail(emailTo, 'Placement Drive Invitation - Abhishek Academy', {
      name: college.poc?.name || college.name,
      subject: 'Placement Drive Invitation',
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #13294B; text-align: center;">🌟 Placement Drive Invitation</h2>
          <p>Dear <strong>${college.poc?.name || college.name} Team</strong>,</p>
          <p>Excited to host a Placement Drive at your university! Students from ${technologies?.join(', ') || 'various programs'} are eligible.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background: #13294B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Confirm Participation
            </a>
          </div>
          <p>Best regards,<br>Abhishek Academy Placement Team</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `Placement drive invite sent to ${college.name}`,
      data: { college }
    });
  } catch (error) {
    console.error('Send placement email error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { sendPlacementDriveEmail };

