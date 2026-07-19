const PerformanceReview = require("../../models/PerformanceReview");
const Goal = require("../../models/Goal");
const User = require("../../models/Auth/User");

// Get stats summary (average rating, goals progress etc)
const getPerformanceStats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const [reviews, goals] = await Promise.all([
      PerformanceReview.find({ staff: userId }),
      Goal.find({ staff: userId })
    ]);

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.overallRating, 0) / totalReviews).toFixed(1))
      : 0;

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === "completed").length;
    const goalsCompletionRate = totalGoals > 0
      ? Math.round((completedGoals / totalGoals) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalReviews,
        averageRating,
        totalGoals,
        completedGoals,
        goalsCompletionRate
      }
    });
  } catch (error) {
    console.error("Get performance stats error:", error);
    res.status(500).json({ success: false, message: "Server error fetching stats" });
  }
};

// Get personal performance reviews
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const reviews = await PerformanceReview.find({ staff: userId })
      .populate("reviewer", "name email designation")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ success: false, message: "Server error fetching reviews" });
  }
};

// Get personal goals or team progress for admin/manager
const getMyGoals = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const role = (req.user.role || "").toLowerCase();
    const isAdmin = ["super_admin", "superadmin", "admin", "hr", "manager"].includes(role);

    let query = {};
    if (!isAdmin) {
      query.staff = userId;
    }

    const goals = await Goal.find(query)
      .populate("staff", "name email department designation")
      .sort({ targetDate: 1 })
      .lean();

    res.json({ success: true, data: goals });
  } catch (error) {
    console.error("Get performance goals error:", error);
    res.status(500).json({ success: false, message: "Server error fetching goals" });
  }
};

module.exports = {
  getPerformanceStats,
  getMyReviews,
  getMyGoals
};
