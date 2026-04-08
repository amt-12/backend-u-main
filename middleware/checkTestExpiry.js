const redis = require("../config/redis");

const checkTestExpiry = async (req, res, next) => {
  try {
    const { studentId } = req.body || req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required for this action"
      });
    }

    const sessionKey = `test:session:${studentId}`;
    const session = await redis.get(sessionKey);

    if (!session) {
      return res.status(403).json({
        success: false,
        message: "Test session has expired or does not exist",
        code: "SESSION_EXPIRED"
      });
    }

    next();
  } catch (error) {
    console.error("error in checkTestExpiry middleware:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during session validation"
    });
  }
};

module.exports = checkTestExpiry;
