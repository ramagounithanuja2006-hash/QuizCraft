const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

const app = express();


// Connect MongoDB
connectDB();


// Middleware
app.use(cors());
app.use(express.json());


// Test route
app.get("/", (req, res) => {
    res.json({
        message: "QuizCraft Backend API is running"
    });
});


// Routes
app.use(
    "/api/auth",
    require("./routes/authRoutes")
);

app.use(
    "/api/quizzes",
    require("./routes/quizRoutes")
);

app.use(
    "/api/attempts",
    require("./routes/attemptRoutes")
);


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({
        message: "Internal Server Error"
    });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `QuizCraft Backend running on http://localhost:${PORT}`
    );
});