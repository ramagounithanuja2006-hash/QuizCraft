const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");

const {
    calculateScore
} = require("../services/scoreService");


// SUBMIT QUIZ
const submitAttempt = async (req, res) => {
    try {
        const { quizId, answers } = req.body;

        if (!quizId || !Array.isArray(answers)) {
            return res.status(400).json({
                message: "quizId and answers are required"
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const result = calculateScore(
            quiz.questions,
            answers
        );

        const attempt = await Attempt.create({
            user: req.user.id,
            quiz: quiz._id,
            answers,
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage
        });

        res.status(201).json({
            message: "Quiz submitted successfully",
            result: {
                attemptId: attempt._id,
                quizId: quiz._id,
                score: result.score,
                totalQuestions: result.totalQuestions,
                percentage: result.percentage,
                answers
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to submit quiz",
            error: error.message
        });
    }
};


// GET MY ATTEMPTS
const getMyAttempts = async (req, res) => {
    try {
        const attempts = await Attempt.find({
            user: req.user.id
        })
            .populate("quiz", "title category")
            .sort({ createdAt: -1 });

        res.json(attempts);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get attempts",
            error: error.message
        });
    }
};


// GET SINGLE ATTEMPT
const getAttemptById = async (req, res) => {
    try {
        const attempt = await Attempt.findById(req.params.id)
            .populate("quiz")
            .populate("user", "name email");

        if (!attempt) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        if (attempt.user._id.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not allowed to view this attempt"
            });
        }

        res.json(attempt);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get attempt",
            error: error.message
        });
    }
};


module.exports = {
    submitAttempt,
    getMyAttempts,
    getAttemptById
};