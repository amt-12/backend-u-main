const BookCall = require('../models/BookCall');

const createBookCall = async (req, res) => {
  try {
    const { name, email, instagram, tags, subTags, package: pkgTitle, description, date } = req.body;

    // Basic validation
    if (!name || !email || !date) {
      return res.status(400).json({ success: false, error: 'Name, email, and date are required' });
    }

    const newBooking = new BookCall({
      name,
      email,
      instagram,
      tags: tags || [],
      subTags: subTags || [],
      package: pkgTitle,
      description,
      date: new Date(date)
    });

    await newBooking.save();

    // WhatsApp notification log to 9915497887 (implement Twilio/service later)
    console.log('🚀 New BookCall - Send WhatsApp to 9915497887:', {
      name,
      phone: '9915497887',
      email,
      date: new Date(date).toLocaleDateString('en-IN'),
      time: new Date(date).toLocaleTimeString('en-IN'),
      tags: tags?.join(', ') || 'Consultation',
      package: pkgTitle,
      instagram,
      description
    });

    res.status(201).json({ success: true, message: 'Booking created successfully' });
  } catch (error) {
    console.error('BookCall create error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await BookCall.find({
      date: { $gte: new Date() },
      status: 'pending'
    }).select('date').sort('date');

    const bookedDates = bookings.map(b => b.date.toISOString().split('T')[0]); // YYYY-MM-DD
    res.status(200).json({ success: true, message: 'Bookings fetched', data: bookedDates });
  } catch (error) {
    console.error('GetBookings error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getAllBookCalls = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};
    if (status && ['pending', 'confirmed', 'cancelled'].includes(String(status))) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { instagram: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      BookCall.find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip)
        .lean(),
      BookCall.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get all BookCalls error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const updateBookCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await BookCall.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update BookCall status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const deleteBookCall = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BookCall.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete BookCall error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getBookCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await BookCall.findById(id).lean();
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get BookCall by ID error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const updateBookCall = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updated = await BookCall.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update BookCall error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
  createBookCall,
  getBookings,
  getAllBookCalls,
  updateBookCallStatus,
  deleteBookCall,
  getBookCallById,
  updateBookCall
};

