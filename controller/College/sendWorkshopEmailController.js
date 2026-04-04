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

    const emailTo = college.contact?.email || college.poc?.email;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    await sendEmail(emailTo, 'Workshop Invitation - Unreal', {
      name: college.poc?.name || college.name,
      message: WORKSHOP_EMAIL_CONTENT
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
