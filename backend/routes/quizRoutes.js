const express = require("express");

const router = express.Router();

const {
    createQuiz,
    getQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz
} = require("../controllers/quizController");

const authMiddleware = require("../middleware/authMiddleware");


// GET /api/quizzes
router.get("/", getQuizzes);


// GET /api/quizzes/:id
router.get("/:id", getQuizById);


// POST /api/quizzes
router.post("/", authMiddleware, createQuiz);


// PUT /api/quizzes/:id
router.put("/:id", authMiddleware, updateQuiz);


// DELETE /api/quizzes/:id
router.delete("/:id", authMiddleware, deleteQuiz);


module.exports = router;