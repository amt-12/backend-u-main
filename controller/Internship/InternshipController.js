const Student = require('../../models/Student.model');

const applyForInternship = async (req, res) => {
  try {
    const { name, email, phone, college, city, education, course, passingYear, semester, technology, link } = req.body;

    // Basic validation
    if (!name || !email || !phone || !college) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, and college.'
      });
    }

    // Check if the application already exists for this email
    const existingApplication = await Student.findOne({ email });
    if (existingApplication) {
      return res.status(200).json({
        success: true,
        message: 'You have already applied for this internship. We are using your existing application.',
        data: {
          studentId: existingApplication._id,
          studentName: existingApplication.name,
          technology: existingApplication.technology
        }
      });
    }

    // Create a new application
    const application = await Student.create({
      name,
      email,
      phone,
      college,
      city,
      education,
      course,
      passingYear,
      semester,
      technology,
      link: link || false
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: {
        studentId: application._id,
        studentName: application.name,
        technology: application.technology
      }
    });
  } catch (error) {
    console.error('Internship application error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your application. Please try again later.'
    });
  }
};

module.exports = {
  applyForInternship
};

