const College = require('../../models/College');
const { sendEmail } = require('../../services/emailService');
const { GUEST_LECTURE_EMAIL_CONTENT } = require('../../services/emailTemplates');

const sendGuestLectureEmail = async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
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

    // Update status for guest lecture (summer training)
    college.inviteStatus = 'waiting';
    college.dateSubmittedAt = new Date();
    college.guestLectureEmailSent = true;

    await college.save();

    const emailTo = college.contact?.email || college.poc?.email;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const name = college.poc?.name || college.name;
    const message = GUEST_LECTURE_EMAIL_CONTENT.replace(/\${name}/g, name);

    await sendEmail(emailTo, 'Guest Lecture Invitation - Unreal', {
      name,
      subject: 'Guest Lecture Invitation',
      message
    });

    res.json({
      success: true,
      message: `Guest lecture invite sent to ${college.name}`,
      data: { college }
    });
  } catch (error) {
    console.error('Send guest lecture email error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { sendGuestLectureEmail };

