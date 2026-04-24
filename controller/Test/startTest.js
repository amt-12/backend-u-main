const redis = require("../../config/redis");
const TestSession = require("../../models/TestSession.model");
const Student = require("../../models/Student.model");

const TEST_DURATION_SECONDS = 25 * 60; // 25 minutes

const startTest = async (req, res, next) => {
  try {
    console.log("🔄 [startTest] Starting test initialization");
    const { studentId, testId } = req.body;
    console.log("📝 [startTest] Received request body:", { studentId, testId });

    if (!studentId || !testId) {
      console.log("❌ [startTest] Validation failed: Missing studentId or testId");
      return res.status(400).json({
        success: false,
        message: "studentId and testId are required"
      });
    }

    // 1️⃣ Validate student exists
    // const student = await Student.findById(studentId);
    // if (!student) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Student not found"
    //   });
    // }

    // 2️⃣ Prevent multiple test starts (REDIS LOCK)
    console.log("🔒 [startTest] Attempting to acquire Redis lock for studentId:", studentId);
    const lockKey = `test:lock:${studentId}`;
    const sessionKey = `test:session:${studentId}`;

    const lock = await redis.set(lockKey, "LOCKED", "NX", "EX", 10);
    if (!lock) {
      console.log("🚫 [startTest] Lock acquisition failed - test already in progress for studentId:", studentId);
      return res.status(409).json({
        success: false,
        message: "Test already started or in progress"
      });
    }
    console.log("✅ [startTest] Redis lock acquired successfully");

    // 3️⃣ Check if session already exists (Redis)
    const existingSession = await redis.get(sessionKey);
    if (existingSession) {
      const ttl = await redis.ttl(sessionKey);

      // Still clear question/order caches so a technology change is always respected
      try {
        const keys = await redis.keys(`test:questions:${studentId}:*`);
        if (keys.length > 0) await redis.del(...keys);
        await redis.del(`test:order:${studentId}`);
        // Also clear tech-keyed order keys
        const orderKeys = await redis.keys(`test:order:${studentId}:*`);
        if (orderKeys.length > 0) await redis.del(...orderKeys);
      } catch (err) {
        console.warn("⚠️ [startTest] Error clearing caches on existing session:", err.message);
      }

      return res.status(200).json({
        success: true,
        message: "Test already running",
        remainingTimeSeconds: ttl
      });
    }

    // 4️⃣ Invalidate old question/order caches (Fresh start)
    try {
      // Clear all question caches (covers tech-keyed keys like test:questions:id:graphics)
      const questionKeys = await redis.keys(`test:questions:${studentId}:*`);
      if (questionKeys.length > 0) await redis.del(...questionKeys);
      // Clear all order caches (covers tech-keyed keys like test:order:id:graphics)
      const orderKeys = await redis.keys(`test:order:${studentId}:*`);
      if (orderKeys.length > 0) await redis.del(...orderKeys);
      // Also clear legacy non-tech-keyed order key
      await redis.del(`test:order:${studentId}`);
      console.log("🧹 [startTest] Cleared all question/order caches for student:", studentId);
    } catch (err) {
      console.warn("⚠️ [startTest] Error clearing caches:", err.message);
    }

    // 5️⃣ Create Mongo TestSession (PERMANENT RECORD)
    console.log("💾 [startTest] Creating MongoDB TestSession record");
    const startedAt = new Date();

    await TestSession.create({
      studentId,
      testId,
      startedAt
    });
    console.log("✅ [startTest] MongoDB TestSession created successfully");

    // 5️⃣ Create Redis LIVE session with TTL
    console.log("🔄 [startTest] Creating Redis session with TTL");
    const sessionData = {
      studentId,
      testId,
      startedAt: startedAt.getTime()
    };

    await redis.set(
      sessionKey,
      JSON.stringify(sessionData),
      "EX",
      TEST_DURATION_SECONDS
    );
    console.log("✅ [startTest] Redis session created successfully with TTL:", TEST_DURATION_SECONDS);

    // 6️⃣ Response
    console.log("📤 [startTest] Sending success response");
    res.status(201).json({
      success: true,
      message: "Test started successfully",
      durationMinutes: 25,
      remainingTimeSeconds: TEST_DURATION_SECONDS
    });

  } catch (error) {
    console.error("❌ [startTest] Error occurred:", error.message);
    console.error("❌ [startTest] Stack trace:", error.stack);
    next(error);
  }
};

module.exports = startTest;
