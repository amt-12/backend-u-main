const Question = require("../../models/Question.model");

const addQuestion = async (req, res, next) => {
  try {
    const { testId, question, options, type, technology, correctAnswer } = req.body;

    if (!testId || !question || !options || !type || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: "testId, question, options, type, and correctAnswer are required"
      });
    }

    const newQuestion = await Question.create({
      testId,
      question,
      options,
      type,
      technology,
      correctAnswer
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      question: newQuestion
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addQuestion;
