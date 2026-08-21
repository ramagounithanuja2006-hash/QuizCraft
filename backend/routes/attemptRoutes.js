const express = require("express");

const router = express.Router();

const {
    submitAttempt,
    getMyAttempts,
    getAttemptById
} = require("../controllers/attemptController");

const authMiddleware = require("../middleware/authMiddleware");


// POST /api/attempts
router.post("/", authMiddleware, submitAttempt);


// GET /api/attempts/my
router.get("/my", authMiddleware, getMyAttempts);


// GET /api/attempts/:id
router.get("/:id", authMiddleware, getAttemptById);


module.exports = router;