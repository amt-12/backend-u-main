const Result = require("../../models/Result.model");
const Student = require("../../models/Student.model");

const getTestResults = async (req, res, next) => {
  try {
    const { testId, collegeId, studentId } = req.query;
    const query = {};

    if (testId) query.testId = testId;
    if (collegeId) query.collegeId = collegeId;
    if (studentId) query.studentId = studentId;

    const results = await Result.find(query)
      .populate('studentId', 'fullName email technology college')
      .populate('collegeId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getTestResults;
