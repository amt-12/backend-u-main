const Result = require("../../models/Result.model");
const Student = require("../../models/Student.model");
const College = require("../../models/College");
const InternshipApplication = require("../../models/InternshipApplication");
const StudentRegistration = require("../../models/StudentRegistration.model");

/**
 * Get student test results filtered by college with stats and pagination
 * GET /api/student/results-by-college
 */
const getResultsByCollege = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      collegeId, 
      status, 
      startDate, 
      endDate,
      testId 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    // Build query for Result model
    const query = {};
    if (collegeId) query.collegeId = collegeId;
    if (testId) query.testId = testId;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Fetch results with population
    // Note: studentId ref is Student, but many records might be in InternshipApplication
    let results = await Result.find(query)
      .populate('studentId')
      .populate('collegeId')
      .sort({ createdAt: -1 });

    // Transform results with smart collection lookup
    let processedResults = await Promise.all(results.map(async (r) => {
      let student = r.studentId;
      let studentSource = 'Student';

      // If population failed, try InternshipApplication
      if (!student && r.studentId) {
        student = await InternshipApplication.findById(r.studentId).populate('college');
        studentSource = student ? 'InternshipApplication' : 'Unknown';
      }

      // If still missing, check Registration (less likely but for safety)
      if (!student && r.studentId) {
        student = await StudentRegistration.findById(r.studentId).populate('college');
        studentSource = student ? 'StudentRegistration' : 'Unknown';
      }

      const college = r.collegeId || (student && student.college && typeof student.college === 'object' ? student.college : {});
      
      const percentage = r.totalQuestions > 0 
        ? Math.round((r.correct / r.totalQuestions) * 100) 
        : 0;
      
      const passThreshold = 50;
      const resultStatus = percentage >= passThreshold ? 'PASS' : 'FAIL';

      // Unified mapping logic
      const name = student ? (student.fullName || student.name || 'N/A') : 'N/A';
      const email = student ? (student.email || student.collegeEmail || 'N/A') : 'N/A';
      const collegeName = college.name || (student && student.collegeName) || (student && typeof student.college === 'string' ? student.college : 'N/A');
      const course = student ? (student.course || 'N/A') : 'N/A';

      return {
        _id: r._id,
        studentId: r.studentId,
        studentName: name,
        studentEmail: email,
        collegeId: college._id || r.collegeId,
        collegeName: collegeName,
        course: course,
        testId: r.testId,
        totalQuestions: r.totalQuestions,
        attempted: r.attempted,
        correct: r.correct,
        score: r.score,
        percentage: percentage,
        status: resultStatus,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        _debug_source: studentSource // Helpful for debugging population issues
      };
    }));

    // Apply search filter (name or email) after intelligent mapping
    if (search) {
      const searchLower = search.toLowerCase();
      processedResults = processedResults.filter(r => 
        r.studentName.toLowerCase().includes(searchLower) || 
        r.studentEmail.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (status) {
      processedResults = processedResults.filter(r => r.status === status);
    }

    // Calculate Statistics based on the entire (filtered but not yet paginated) dataset
    const totalCount = processedResults.length;
    const passedCount = processedResults.filter(r => r.status === 'PASS').length;
    const failedCount = totalCount - passedCount;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const averageScore = totalCount > 0 
      ? Math.round(processedResults.reduce((acc, curr) => acc + curr.percentage, 0) / totalCount) 
      : 0;

    // Finally apply pagination to the processed results
    const paginatedResults = processedResults.slice(skip, skip + pageSize);

    // Get all colleges for the dropdown
    const colleges = await College.find({}, 'name').sort({ name: 1 });

    res.json({
      success: true,
      data: {
        results: paginatedResults,
        stats: {
          total: totalCount,
          passed: passedCount,
          failed: failedCount,
          passRate: passRate,
          averageScore: averageScore
        },
        colleges: colleges,
        pagination: {
          page: parseInt(page),
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      }
    });

  } catch (error) {
    console.error('Error in getResultsByCollege:', error);
    next(error);
  }
};

module.exports = {
  getResultsByCollege
};
