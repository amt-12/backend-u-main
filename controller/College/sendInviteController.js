const College = require('../../models/College');
const { sendEmail } = require('../../services/emailService'); // Optional integration

const sendInvite = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access only' });
    }

    const { id } = req.params;
    const { technologies, educationPrograms } = req.body;

    if (!technologies || !Array.isArray(technologies) || technologies.length === 0) {
      return res.status(400).json({ success: false, error: 'Technologies are required' });
    }

    if (!educationPrograms || !Array.isArray(educationPrograms) || educationPrograms.length === 0) {
      return res.status(400).json({ success: false, error: 'Education programs are required' });
    }

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, error: 'College not found' });
    }

    if (!college.contact?.email && !college.poc?.email) {
      return res.status(400).json({ success: false, error: 'No email found for college' });
    }

// Update invite status and tracking
    college.inviteStatus = 'invited';
    college.invitedAt = new Date();
    
    // Generate secure invite token
    const crypto = require('crypto');
    college.inviteToken = crypto.randomBytes(32).toString('hex');
    college.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await college.save();


    const emailTo = college.contact?.email || college.poc?.email;
    if (emailTo) {
      const { sendEmail } = require('../../services/emailService');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteLink = `${frontendUrl}/placement-drive/${college.inviteToken}`;
      
      await sendEmail(emailTo, 'Placement Drive Invitation - Abhishek Academy', {
        name: college.poc?.name || college.name,
        subject: 'Placement Drive Invitation',
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #13294B; text-align: center;">🌟 Placement Drive Invitation</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Dear <strong>${college.poc?.name || college.name} Team</strong>,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Warm greetings from <strong>Abhishek Academy</strong>! 
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 18px; color: #13294B;">
                About Abhishek Academy
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 1.6;">
                We are a leading training institute specializing in cutting-edge technologies, 
                empowering students with industry-ready skills for successful careers in IT and software development.
              </p>
            </div>
            
            <h3 style="color: #13294B;">📚 We are excited to host a <strong>Placement Drive</strong> at your prestigious university!</h3>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                         color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">Target Technologies:</h4>
              <p style="margin: 0;">${technologies.join(', ')}</p>
              
              <h4 style="margin: 15px 0 10px 0;">Education Programs:</h4>
              <p style="margin: 0;">${educationPrograms.join(', ')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background: #13294B; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-size: 18px; 
                        font-weight: bold; display: inline-block;">
                🎯 Confirm Your Participation
              </a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Please click the button above to select your preferred dates for the placement drive. 
              Our team will follow up to finalize all arrangements.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Best regards,<br>
              <strong>Placement Team</strong><br>
              Abhishek Academy<br>
              <a href="${frontendUrl}" style="color: #13294B;">Visit Website</a>
            </p>
          </div>
        `
      });
    }

    res.json({
      success: true,
      message: `Invite sent to ${college.name}`,
      data: { college }
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { sendInvite };

