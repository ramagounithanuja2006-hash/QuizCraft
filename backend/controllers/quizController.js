const Quiz = require("../models/Quiz");


// CREATE QUIZ
const createQuiz = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            questions
        } = req.body;

        if (!title || !category || !questions) {
            return res.status(400).json({
                message: "Title, category and questions are required"
            });
        }

        const quiz = await Quiz.create({
            title,
            description,
            category,
            questions,
            creator: req.user.id
        });

        res.status(201).json({
            message: "Quiz created successfully",
            quiz
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create quiz",
            error: error.message
        });
    }
};


// GET ALL QUIZZES
const getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find()
            .populate("creator", "name email")
            .sort({ createdAt: -1 });

        res.json(quizzes);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get quizzes",
            error: error.message
        });
    }
};


// GET SINGLE QUIZ
const getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate("creator", "name email");

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        res.json(quiz);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get quiz",
            error: error.message
        });
    }
};


// UPDATE QUIZ
const updateQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        if (quiz.creator.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not allowed to update this quiz"
            });
        }

        const updatedQuiz = await Quiz.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.json({
            message: "Quiz updated successfully",
            quiz: updatedQuiz
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update quiz",
            error: error.message
        });
    }
};


// DELETE QUIZ
const deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        if (quiz.creator.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not allowed to delete this quiz"
            });
        }

        await Quiz.findByIdAndDelete(req.params.id);

        res.json({
            message: "Quiz deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete quiz",
            error: error.message
        });
    }
};


module.exports = {
    createQuiz,
    getQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz
};