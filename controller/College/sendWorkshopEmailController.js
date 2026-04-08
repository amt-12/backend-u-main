const College = require('../../models/College');
const { sendEmail } = require('../../services/emailService');
const { WORKSHOP_EMAIL_CONTENT } = require('../../services/emailTemplates');

const sendWorkshopEmail = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { id } = req.params;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    }

    if (!college.contact?.email && !college.poc?.email) {
      return res.status(400).json({ success: false, error: 'No email found for college' });
    }

    // Update status for workshop
    college.inviteStatus = 'invited';
    college.invitedAt = new Date();
    college.workshopEmailSent = true;

    await college.save();

    // Generate secure invite token
    const crypto = require('crypto');
    college.inviteToken = crypto.randomBytes(32).toString('hex');
    college.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await college.save();

    const emailTo = college.contact?.email || college.poc?.email;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/placement-drive/${college.inviteToken}`;

    let emailHtml = WORKSHOP_EMAIL_CONTENT.replace(/{{inviteLink}}/g, inviteLink);

    sendEmail(emailTo, 'Workshop Invitation - Unreal', {
      name: college.poc?.name || college.name,
      message: emailHtml
    });

    res.json({
      success: true,
      message: `Workshop invite sent to ${college.name}`,
      data: { college }
    });
  } catch (error) {
    console.error('Send workshop email error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { sendWorkshopEmail };
