const User = require('../../models/Auth/User');
const { sendOtpEmail } = require('../../services/emailService');
const { generateOtp } = require('../../services/otpService');
const cache = require('../../middleware/cache');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!['super_admin', 'admin', 'manager', 'executive'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Staff role required.' });
    }

    const cooldownKey = `forgot_pwd_cooldown:${email}`;
    if (cache.userCache.get(cooldownKey)) {
      return res.status(429).json({ success: false, message: 'OTP on cooldown. Try again in 2 minutes.' });
    }

    const otp = generateOtp();
    const otpKey = `forgot_pwd_otp:${email}`;
    cache.userCache.set(otpKey, otp, 120); // 2 minutes
    cache.userCache.set(cooldownKey, true, 120); // 2 min cooldown

    console.log(`Forgot Password OTP ${otp} sent for ${email}`);
    await sendOtpEmail(email, otp, user.name);

    res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const otpKey = `forgot_pwd_otp:${email}`;
    const cachedOtp = cache.userCache.get(otpKey);

    if (!cachedOtp) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
    }

    if (cachedOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Generate a verification token for the reset step
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenKey = `pwd_reset_token:${email}`;
    cache.userCache.set(tokenKey, verificationToken, 600); // 10 minutes to reset password

    // Clean up OTP
    cache.userCache.del(otpKey);
    cache.userCache.del(`forgot_pwd_cooldown:${email}`);

    res.status(200).json({ success: true, message: 'OTP verified successfully', verificationToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, verificationToken, newPassword, confirmPassword } = req.body;

    if (!email || !verificationToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const tokenKey = `pwd_reset_token:${email}`;
    const cachedToken = cache.userCache.get(tokenKey);

    if (!cachedToken || cachedToken !== verificationToken) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification session' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Clear cached model to force a refresh on next login
    const recentUsers = cache.userCache.get('recentUsers') || {};
    if (recentUsers[email]) {
      delete recentUsers[email];
      cache.userCache.set('recentUsers', recentUsers, 300);
    }
    if (user._id) {
      cache.invalidateUserCache(user._id);
    }
    cache.userCache.del(tokenKey);

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resetPassword
};
