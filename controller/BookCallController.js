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

    // WhatsApp notification log to 7739950105 (implement Twilio/service later)
    console.log('🚀 New BookCall - Send WhatsApp to 7739950105:', {
      name,
      phone: '7739950105',
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

    let query = { movedToOnboarded: { $ne: true } };
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
        .populate('followUps.by', 'name email')
        .populate('assignedTo', 'name email role')
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
    const booking = await BookCall.findById(id)
      .populate('followUps.by', 'name email')
      .populate('assignedTo', 'name email role')
      .lean();
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
    const updateData = { ...req.body };
    const category = updateData.category;
    delete updateData.category;

    // Category-specific fields that go into categoryData
    const categoryFields = ['estimatedDealValue', 'finalDealValue', 'assignedTo', 'status', 'followUpDate'];

    if (category) {
      // Extract category-specific values and put them in categoryData
      const catUpdate = {};
      for (const field of categoryFields) {
        if (updateData[field] !== undefined) {
          catUpdate[`categoryData.${category}.${field}`] = updateData[field];
          // Also keep top-level in sync for backward compat
        }
      }
      // Remove category fields from top-level update
      for (const field of categoryFields) {
        delete updateData[field];
      }

      const setObj = { ...updateData, ...catUpdate };
      const updated = await BookCall.findByIdAndUpdate(id, { $set: setObj }, { new: true })
        .populate('followUps.by', 'name email')
        .populate('assignedTo', 'name email role')
        .lean();
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      return res.json({ success: true, data: updated });
    }

    // No category — legacy behavior, update top-level
    const updated = await BookCall.findByIdAndUpdate(id, updateData, { new: true })
      .populate('followUps.by', 'name email')
      .populate('assignedTo', 'name email role')
      .lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update BookCall error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, nextFollowUpDate, status } = req.body;

    if (!notes) {
      return res.status(400).json({ success: false, error: 'Follow-up notes are required' });
    }

    const booking = await BookCall.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (!booking.followUps) booking.followUps = [];

    booking.followUps.push({
      date: new Date(),
      notes,
      status: status || 'completed',
      by: userId
    });

    if (nextFollowUpDate) {
      booking.followUpDate = new Date(nextFollowUpDate);
    }

    await booking.save();

    const updated = await BookCall.findById(id)
      .populate('followUps.by', 'name email')
      .populate('assignedTo', 'name email role');

    res.json({
      success: true,
      message: 'Follow-up added successfully',
      data: updated
    });
  } catch (error) {
    console.error('Add follow-up error:', error);
    res.status(500).json({ success: false, error: 'Server error adding follow-up' });
  }
};

const moveToOnboarded = async (req, res) => {
  try {
    const { bookingIds, details, category } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Booking IDs are required' });
    }

    const BrandLead = require('../models/BrandLead');

    const createdBy = req.user?.userId || req.user?._id || req.user?.id;

    const results = [];
    for (const id of bookingIds) {
      const booking = await BookCall.findById(id);
      if (!booking) continue;

      if (booking.movedToOnboarded) continue;

      // Extract and format details
      const brandName = details?.brandName || `${booking.name}'s Brand`;
      const companyName = details?.companyName || `${booking.name} Company`;
      const contactPerson = details?.contactPerson || booking.name;
      const email = details?.email || booking.email;
      const phone = details?.phone || booking.phone || '';
      const website = details?.website || '';
      const status = details?.status || 'onboarded';
      const estimatedDealValue = details?.estimatedDealValue !== undefined ? parseFloat(details.estimatedDealValue) : (booking.package ? parseFloat(booking.package) || 0 : 0);
      const finalDealValue = details?.finalDealValue !== undefined ? parseFloat(details.finalDealValue) : 0;
      const dealValue = finalDealValue || estimatedDealValue || 0;
      const source = details?.source || 'Inbound Website';
      const assignedTo = details?.assignedTo || null;
      const instagram = details?.instagram || booking.instagram || '';
      const budget = details?.budget || '';
      const requirements = details?.requirements || booking.tags || [];
      const brandDescription = details?.brandDescription || booking.description || '';
      const followUpDate = details?.followUpDate ? new Date(details.followUpDate) : null;
      const notes = details?.notes || `Imported from booking ${booking._id}. Description: ${booking.description || 'None'}`;
      
      const deliverables = details?.deliverables || {
        branding: { checked: false, count: 0 },
        ugc: { checked: false, count: 0 },
        reels: { checked: false, count: 0 },
        posts: { checked: false, count: 0 }
      };

      // Create BrandLead with onboarded status and details
      const brandLead = new BrandLead({
        brandName,
        companyName,
        contactPerson,
        email,
        phone,
        website,
        status,
        dealValue,
        estimatedDealValue,
        finalDealValue,
        source,
        notes,
        instagram,
        requirements,
        budget,
        brandDescription,
        followUpDate,
        assignedTo,
        deliverables,
        createdBy
      });

      await brandLead.save();

      // Initialize onboardedCategories if not exists
      if (!booking.onboardedCategories) {
        booking.onboardedCategories = [];
      }

      // Add the active category passed from frontend
      if (category && !booking.onboardedCategories.includes(category)) {
        booking.onboardedCategories.push(category);
      } else if (!category) {
        // Fallback: if category not supplied, default based on requirements/tags
        let defaultCategory = 'digital_marketing';
        if (requirements.some(req => {
          const l = req.toLowerCase();
          return l.includes('website') || l.includes('web') || l.includes('deelopemnt') || l.includes('develop');
        })) {
          defaultCategory = 'website_development';
        } else if (requirements.some(req => {
          const l = req.toLowerCase();
          return l.includes('reels') || l.includes('tiktok') || l.includes('short form') || l.includes('shoot') || l.includes('production');
        })) {
          defaultCategory = 'ad_production';
        }
        if (!booking.onboardedCategories.includes(defaultCategory)) {
          booking.onboardedCategories.push(defaultCategory);
        }
      }

      // Check if completely onboarded (matches all categories in tags)
      const hasWebDev = booking.tags && booking.tags.some(tag => {
        const lower = tag.toLowerCase().trim();
        return (
          lower.includes('website') ||
          lower.includes('web') ||
          lower.includes('deelopemnt') ||
          lower.includes('develop')
        );
      });

      const hasAdProduction = booking.tags && booking.tags.some(tag => {
        const lower = tag.toLowerCase().trim();
        return (
          lower.includes('reels') ||
          lower.includes('tiktok') ||
          lower.includes('short form') ||
          lower.includes('shoot') ||
          lower.includes('production')
        );
      });

      const hasDigitalMarketing = booking.tags && (
        booking.tags.length === 0 ||
        booking.tags.some(tag => {
          const lower = tag.toLowerCase().trim();
          return (
            lower.includes('digital') ||
            lower.includes('digi') ||
            lower.includes('digtal') ||
            lower.includes('marketing') ||
            lower.includes('ads') ||
            lower.includes('seo') ||
            lower.includes('branding') ||
            lower.includes('influencer') ||
            lower.includes('copywriting') ||
            lower.includes('content')
          );
        })
      );

      const requiredCategories = [];
      if (hasWebDev) requiredCategories.push('website_development');
      if (hasAdProduction) requiredCategories.push('ad_production');
      if (hasDigitalMarketing) requiredCategories.push('digital_marketing');
      if (requiredCategories.length === 0) {
        requiredCategories.push('digital_marketing');
      }

      const allOnboarded = requiredCategories.every(cat => 
        booking.onboardedCategories.includes(cat)
      );

      if (allOnboarded) {
        booking.movedToOnboarded = true;
        booking.status = 'confirmed';
      }

      // Update the status to confirmed inside categoryData for the onboarded category
      if (category && booking.categoryData) {
        const current = booking.categoryData.get ? booking.categoryData.get(category) : booking.categoryData[category];
        const currentObj = current && typeof current.toObject === 'function' ? current.toObject() : current;
        const updatedCat = { ...(currentObj || {}), status: 'confirmed' };
        if (booking.categoryData.set) {
          booking.categoryData.set(category, updatedCat);
        } else {
          booking.categoryData[category] = updatedCat;
        }
        booking.markModified('categoryData');
      }


      await booking.save();

      results.push(brandLead);
    }

    res.status(200).json({
      success: true,
      message: `Successfully moved ${results.length} leads to Onboarded Clients`,
      data: results
    });
  } catch (error) {
    console.error('Move to onboarded error:', error);
    res.status(500).json({ success: false, error: 'Server error moving leads' });
  }
};

module.exports = {
  createBookCall,
  getBookings,
  getAllBookCalls,
  updateBookCallStatus,
  deleteBookCall,
  getBookCallById,
  updateBookCall,
  addFollowUp,
  moveToOnboarded
};

