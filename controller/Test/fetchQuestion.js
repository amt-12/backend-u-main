const redis = require("../../config/redis");
const Question = require("../../models/Question.model");
const Student = require("../../models/Student.model");
const InternshipApplication = require("../../models/InternshipApplication");

/**
 * Normalizes technology names from the frontend/payload 
 * to match database question types.
 */
const normalizeTechnology = (tech) => {
  if (!tech) return "mern";
  const t = tech.toLowerCase().trim();
  
  // Mapping logic
  if (t.includes("mern") || t.includes("full stack")) return "mern";
  if (t.includes("python")) return "python";
  if (t.includes("ai") || t.includes("machine learning")) return "ai-ml";
  if (t.includes("graphic") || t.includes("design")) return "graphic";
  if (t.includes("java")) return "java";
  
  return t; // Default to lowercase if no specific mapping
};

const fetchQuestion = async (req, res, next) => {
  try {
    const { studentId, testId, index = 0 } = req.query;

    if (!studentId || !testId) {
      return res.status(400).json({
        success: false,
        message: "studentId and testId are required"
      });
    }

    // 1️⃣ Initialize Cache Keys
    const questionCacheKey = `test:questions:${studentId}:${testId}`;
    const sessionKey = `test:session:${studentId}`;
    const orderKey = `test:order:${studentId}`;

    // 2️⃣ Check Cache First
    let questions = await redis.get(questionCacheKey);

    if (!questions) {
      console.log(`📚 [fetchQuestion] Cache miss for student: ${studentId}. Initializing fresh 20-question session...`);

      // A. Hybrid Record Lookup (Student or InternshipApplication)
      let rawTechnology = "mern";
      let studentEmail = "";
      
      try {
        let record = await Student.findById(studentId);
        if (record) {
          console.log("🔍 [fetchQuestion] Found in Student model");
        } else {
          record = await InternshipApplication.findById(studentId);
          if (record) console.log("🔍 [fetchQuestion] Found in InternshipApplication model");
        }

        if (record) {
          rawTechnology = record.technology;
          studentEmail = record.email;
          console.log(`✅ [fetchQuestion] Record Found. Raw Tech: "${rawTechnology}", Email: ${studentEmail}`);
        } else {
          console.warn(`⚠️ [fetchQuestion] No record found for ID: ${studentId}. Proceeding with default 'mern'.`);
        }
      } catch (err) {
        console.error("❌ [fetchQuestion] Error in hybrid lookup:", err.message);
      }

      const studentTechnology = normalizeTechnology(rawTechnology);
      console.log(`🎯 [fetchQuestion] Target Tech Standardized: "${studentTechnology}"`);

      // B. Fetch 10 Random Aptitude Questions
      let aptitudeQuestions = await Question.aggregate([
        { $match: { type: "aptitude" } },
        { $sample: { size: 10 } }
      ]);
      console.log(`✅ [fetchQuestion] Fetched ${aptitudeQuestions.length} aptitude questions`);

      // C. Fetch 10 Random Technology Questions
      let techQuestions = await Question.aggregate([
        { $match: { type: studentTechnology } },
        { $sample: { size: 10 } }
      ]);
      console.log(`✅ [fetchQuestion] Fetched ${techQuestions.length} technology questions (${studentTechnology})`);

      // D. Intelligent Fallback (Guarantee 20 questions)
      if (techQuestions.length < 10) {
        console.log(`🔄 [fetchQuestion] Padding tech questions (${techQuestions.length}/10)...`);
        const extraNeeded = 10 - techQuestions.length;
        const extraQuestions = await Question.aggregate([
          { $match: { type: { $nin: ["aptitude", studentTechnology] } } },
          { $sample: { size: extraNeeded } }
        ]);
        techQuestions = [...techQuestions, ...extraQuestions];
        console.log(`✅ [fetchQuestion] Padded tech pool to ${techQuestions.length} questions`);
      }

      const allQuestions = [...aptitudeQuestions, ...techQuestions];
      console.log(`📊 [fetchQuestion] Total session questions: ${allQuestions.length}`);
      
      // E. Data Normalization (Handle semicolon-separated options)
      const normalizedQuestions = allQuestions.map(q => {
        let options = q.options;
        if (typeof options === "string") {
          options = options.split(";").map(opt => opt.trim());
        } else if (Array.isArray(options) && options.length === 1 && typeof options[0] === 'string' && options[0].includes(";")) {
          options = options[0].split(";").map(opt => opt.trim());
        }
        return { ...q, options };
      });

      questions = JSON.stringify(normalizedQuestions);
      await redis.set(questionCacheKey, questions, "EX", 3600); // 1 hour cache
    }

    questions = JSON.parse(questions);

    // 3️⃣ Manage Session Time
    const sessionExists = await redis.exists(sessionKey);
    const ttl = sessionExists ? await redis.ttl(sessionKey) : 0;

    // 4️⃣ Handle Question Order
    let order = await redis.get(orderKey);
    if (!order) {
      const shuffledIndexes = questions.map((_, i) => i).sort(() => Math.random() - 0.5);
      await redis.set(orderKey, JSON.stringify(shuffledIndexes), "EX", 1800);
      order = shuffledIndexes;
    } else {
      order = JSON.parse(order);
    }

    // 5️⃣ Get Meta & Question
    const questionIndex = order[index];
    if (questionIndex === undefined || questionIndex >= questions.length) {
      return res.json({
        success: true,
        message: "No more questions",
        index: Number(index),
        totalQuestions: questions.length,
        remainingTimeSeconds: ttl
      });
    }

    const question = questions[questionIndex];

    res.json({
      success: true,
      index: Number(index),
      question: {
        id: question._id,
        question: question.question,
        options: (question.options || []).map((opt, idx) => ({
          key: `option_${idx}`,
          text: opt
        })),
        totalQuestions: questions.length
      },
      remainingTimeSeconds: ttl,
      hasActiveSession: sessionExists,
      totalQuestions: questions.length
    });

  } catch (error) {
    console.error("❌ Error in fetchQuestion:", error);
    next(error);
  }
};

module.exports = fetchQuestion;
