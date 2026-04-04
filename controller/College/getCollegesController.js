const College = require('../../models/College');

const getColleges = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, city, state } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (state) query['location.state'] = { $regex: state, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.state': { $regex: search, $options: 'i' } },
        { 'assignedTo.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    const assignedTo = req.query.assignedTo;
    if (assignedTo) {
      query.assignedTo = assignedTo;
    } 

    const colleges = await College.find(query)
      .populate('assignedTo', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)); 

    const total = await College.countDocuments(query);

    res.json({
      success: true,
      data: {
        colleges,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { getColleges };

