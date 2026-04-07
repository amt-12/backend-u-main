const College = require('../../models/College');
const { sendEmail, generateInviteToken } = require('../../services/emailService');

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
    const name = college.poc?.name || college.name;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const inviteToken = generateInviteToken();
    college.inviteToken = inviteToken;
    college.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const inviteLink = `${frontendUrl}/placement-drive/${inviteToken}`;

    await sendEmail(emailTo, 'Placement Drive Invitation - Unreal', {
      name,
      form_link: inviteLink,
      subject: 'Placement Drive Invitation'
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

