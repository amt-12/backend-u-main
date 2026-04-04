const College = require('../../models/College');
const { sendEmail } = require('../../services/emailService');

const sendGuestLectureEmail = async (req, res) => {
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

    // Update status for guest lecture (summer training)
    college.inviteStatus = 'waiting';
    college.dateSubmittedAt = new Date();
    college.guestLectureEmailSent = true;

    await college.save();

    const emailTo = college.contact?.email || college.poc?.email;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    await sendEmail(emailTo, 'Guest Lecture Invitation - Abhishek Academy', {
      name: college.poc?.name || college.name,
      subject: 'Guest Lecture Invitation',
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #13294B; text-align: center;">📖 Guest Lecture Invitation</h2>
          <p>Dear <strong>${college.poc?.name || college.name} Team</strong>,</p>
          <p>We would like to invite you for a Guest Lecture session at Abhishek Academy. This is a great opportunity for your students.</p>
          <p>Please confirm your availability.</p>
          <p>Best regards,<br>Abhishek Academy Team</p>
        </div>
      `
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

