const User = require('../../models/Auth/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loginSchema } = require('../../services/validation_schema');


const adminLogin = async (req, res) => {
  try {
    console.log('Raw req.body:', req.body);

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await loginSchema.validateAsync(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error.details[0].message });
    }
    const { email, password } = result;

    console.log('Admin login attempt for email:', email);

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Password check
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required and must be a string' });
    }

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && user.phone) {
      const cleanInput = password.replace(/\D/g, '');
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanInput && cleanPhone) {
        if (cleanInput.length >= 10 && cleanPhone.endsWith(cleanInput)) {
          isMatch = true;
        } else if (cleanPhone.length >= 10 && cleanInput.endsWith(cleanPhone)) {
          isMatch = true;
        } else if (cleanInput === cleanPhone) {
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Strict admin/staff role check
    if (!['super_admin', 'admin', 'manager', 'executive'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Staff role required.' });
    }


    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',

      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Admin login successful',
      user: safeUser,
      token: token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = adminLogin;

