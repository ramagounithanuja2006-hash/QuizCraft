const express = require("express");

const router = express.Router();

const {
    signup,
    login,
    getProfile
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");


// POST /api/auth/signup
router.post("/signup", signup);


// POST /api/auth/login
router.post("/login", login);


// GET /api/auth/profile
router.get("/profile", authMiddleware, getProfile);


module.exports = router;