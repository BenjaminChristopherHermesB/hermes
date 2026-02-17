require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("../routes/auth");
const adminRoutes = require("../routes/admin");
const subjectRoutes = require("../routes/subjects");
const quizRoutes = require("../routes/quiz");
const userRoutes = require("../routes/user");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
});

app.get("/", (req, res) => {
    res.json({ status: "Hermes The Quizzer API is running", version: "1.0.0" });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/user", userRoutes);

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Hermes API running on port ${PORT}`);
    });
}

module.exports = app;
