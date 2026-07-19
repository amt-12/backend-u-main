const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || 'amrit0207232@gmail.com',
    pass: process.env.SMTP_PASS || 'mangwmfmfxysihvx'
  }
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP transporter verify failed:', error.message);
  } else {
    console.log('✅ SMTP transporter is ready to send emails');
  }
});

// Send generic email with optional HTML content
async function sendEmail(to, subject, data = {}) {
  try {
    let html;
    
    if (data.message) {
      // Check if message is a full/self-contained HTML email
      const isFullHtml = data.message.includes('<html') || 
                         data.message.includes('<!DOCTYPE') ||
                         (data.message.includes('<div') && data.message.includes('style='));
      
      if (isFullHtml) {
        html = data.message;
      } else {
        // HTML fragment — wrap in a generic branded email body
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
          </head>
          <body style="margin:0; padding:0; background:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg, #0f172a, #1e3a8a); padding:30px; text-align:center; color:#ffffff;">
                        <img src="https://unrealstudiozz.com/assets/UNREALLOGO-optimized-CywaMXn1.webp" alt="UNREAL" style="max-height:80px; width:auto; display:inline-block;" />
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px; color:#333;">
                        ${data.message}
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#0f172a; color:#cbd5f5; text-align:center; padding:30px 20px; font-size:13px;">
                        <p style="margin:0 0 10px 0;">Unreal | Empowering Careers</p>
                        <p style="margin:0; font-size:12px; opacity:0.7;">© ${new Date().getFullYear()} Unreal. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
      }
    } else {
      // Fallback to template for backward compatibility (e.g., placement drive emails)
      let template = fs.readFileSync(path.join(__dirname, '../templates/email-template.html'), 'utf8');
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, data[key] || '');
      });
      html = template;
    }
    
    await transporter.sendMail({
      from: `"Unreal Studioz" <${process.env.SMTP_EMAIL || 'noreply@unrealstudioz.in'}>`,
      to,
      subject,
      html
    });
    
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
  }
}

// Generate invite token
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Existing functions remain the same...
async function sendWelcomeEmail(to, name, action = 'Welcome') {
  const subject = action === 'Register' ? 'Welcome to Unreal Studioz!' : 'Welcome Back!';
  const message = action === 'Register' 
    ? 'We will connect you shortly, before that enjoy demo class.'
    : 'Welcome back to Unreal Studioz!';
  
  await sendEmail(to, subject, { name, subject, message });
}

async function sendOtpEmail(to, otp, name) {
  await sendEmail(to, 'Unreal Studioz - Your OTP Code', {
    name,
    subject: 'Your OTP Code',
    message: `
      <h3 style="color:#13294B;">Your One-Time Password (OTP)</h3>
      <p>Your OTP is: <strong style="font-size:24px; color:#13294B;">${otp}</strong></p>
      <p>This OTP is valid for <strong>2 minutes</strong>.</p>
    `
  });
}

async function sendStudentWelcomeEmail(to, name, tempPassword, appLink, dashboardLink) {
  await sendEmail(to, 'Welcome to Unreal Studioz LMS!', {
    name,
    subject: 'Welcome!',
    message: `
      <p>Congratulations! Your account has been created.</p>
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Password:</strong> <span style="font-size:18px; color:#13294B;">${tempPassword}</span></p>
      <p><a href="${appLink}">📱 Mobile App</a> | <a href="${dashboardLink}">🌐 Dashboard</a></p>
    `
  });
}

async function sendEnrollmentEmail(to, name, courseName) {
  await sendEmail(to, 'Course Enrollment Confirmed!', {
    name,
    subject: 'Enrollment Confirmed',
    message: `
      <p>Welcome to ${courseName}!</p>
      <p>Your enrollment is now active.</p>
    `
  });
}

async function sendLiveClassStartEmail(to, name, classData) {
  const { title, joinUrl, password, startTime } = classData;
  const formattedTime = startTime ? new Date(startTime).toLocaleString('en-IN') : 'Now';

  await sendEmail(to, `🔴 Live Class: ${title}`, {
    name,
    subject: `Live Class: ${title}`,
    message: `
      <h3 style="color:#13294B;">Live Class Started!</h3>
      <p>Class: ${title}</p>
      <p>Time: ${formattedTime}</p>
      <p>Password: <strong>${password}</strong></p>
      <p style="text-align:center;">
        <a href="${joinUrl}" style="background:#13294B; color:white; padding:12px 24px; text-decoration:none; border-radius:6px;">
          Join Now
        </a>
      </p>
    `
  });
}

// Test completion email
async function sendTestCompletionEmail(student, { score = 0, totalQuestions = 0 }) {
  const to = student.email;
  const name = student.fullName || student.name;
  const subject = 'Test Submitted Successfully! 📝';
  
  const message = `
    <h3 style="color:#13294B;">Congratulations on Completing the Test!</h3>
    <p>Dear ${name},</p>
    <p>Your test has been successfully submitted and recorded.</p>
    <table style="border-collapse:collapse; width:100%; margin:16px 0;">
      <tr style="background:#f9f6ef;">
        <td style="padding:8px; font-weight:bold; color:#13294B;">Score</td>
        <td style="padding:8px;">${score} / ${totalQuestions}</td>
      </tr>
      <tr>
        <td style="padding:8px; font-weight:bold; color:#13294B;">Status</td>
        <td style="padding:8px; color:green;">Successfully Submitted</td>
      </tr>
    </table>
    <p>We will review your performance and get back to you with the next steps.</p>
    <p>Best of luck with your future endeavors!</p>
  `;

  await sendEmail(to, subject, {
    name,
    subject,
    message
  });
}

async function sendStaffWelcomeEmail(to, name, tempPassword, dashboardLink) {
  await sendEmail(to, 'Welcome to Unreal Studioz - Staff Account Created!', {
    name,
    subject: 'Staff Account Created',
    message: `
      <p style="font-size:16px;">Hello <strong>${name}</strong>,</p>
      <p>Your staff account has been created successfully. Below are your login credentials:</p>
      <table style="border-collapse:collapse; width:100%; margin:20px 0; background:#f8fafc; border-radius:8px; overflow:hidden;">
        <tr>
          <td style="padding:12px 16px; font-weight:bold; color:#0f172a; border-bottom:1px solid #e2e8f0; width:40%;">Email</td>
          <td style="padding:12px 16px; color:#334155; border-bottom:1px solid #e2e8f0;">${to}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px; font-weight:bold; color:#0f172a;">Password</td>
          <td style="padding:12px 16px;">
            <span style="font-size:20px; font-weight:bold; color:#1e3a8a; letter-spacing:2px; background:#e0e7ff; padding:4px 12px; border-radius:6px;">${tempPassword}</span>
          </td>
        </tr>
      </table>
      <p style="color:#64748b; font-size:14px;">⚠️ This is a system-generated temporary password. Please log in and change your password immediately after your first login.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${dashboardLink}" style="background:linear-gradient(135deg,#0f172a,#1e3a8a); color:white; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:15px; font-weight:bold; display:inline-block;">
          Go to Dashboard →
        </a>
      </p>
      <p style="color:#94a3b8; font-size:12px; margin-top:16px;">If you have any trouble logging in, contact your administrator.</p>
    `
  });
}

module.exports = { 
  sendEmail, 
  sendWelcomeEmail, 
  sendOtpEmail, 
  sendStudentWelcomeEmail, 
  sendStaffWelcomeEmail,
  sendEnrollmentEmail, 
  sendLiveClassStartEmail,
  sendTestCompletionEmail,
  generateInviteToken
};
