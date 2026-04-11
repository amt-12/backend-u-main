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

// Send generic email with optional HTML content
async function sendEmail(to, subject, data = {}) {
  try {
    let html;
    
    // If message is provided and looks like full HTML, use it directly
    if (data.message && data.message.includes('<div') && data.message.includes('style=')) {
      html = data.message;
    } else {
      // Fallback to old template logic
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

module.exports = { 
  sendEmail, 
  sendWelcomeEmail, 
  sendOtpEmail, 
  sendStudentWelcomeEmail, 
  sendEnrollmentEmail, 
  sendLiveClassStartEmail,
  sendTestCompletionEmail
};

