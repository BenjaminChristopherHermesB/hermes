const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/me", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, username, name, role, theme_preference, created_at FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/theme", async (req, res) => {
    try {
        const { theme } = req.body;

        if (!["dark", "light"].includes(theme)) {
            return res.status(400).json({ error: "Theme must be 'dark' or 'light'" });
        }

        await pool.query("UPDATE users SET theme_preference = $1 WHERE id = $2", [theme, req.user.id]);

        res.json({ message: "Theme updated", theme });
    } catch (err) {
        console.error("Update theme error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/stats/:subjectId", async (req, res) => {
    try {
        const { subjectId } = req.params;

        const totalQuestions = await pool.query(
            "SELECT COUNT(*) FROM questions WHERE subject_id = $1",
            [subjectId]
        );

        const statsResult = await pool.query(
            `SELECT
        COUNT(DISTINCT uqs.question_id) AS total_attempted,
        COUNT(DISTINCT CASE WHEN uqs.times_correct > 0 THEN uqs.question_id END) AS correctly_attempted,
        SUM(uqs.times_attempted) AS total_answers
      FROM user_question_stats uqs
      JOIN questions q ON q.id = uqs.question_id
      WHERE uqs.user_id = $1 AND q.subject_id = $2`,
            [req.user.id, subjectId]
        );

        const quizCount = await pool.query(
            "SELECT COUNT(*) FROM quiz_sessions WHERE user_id = $1 AND subject_id = $2",
            [req.user.id, subjectId]
        );

        const stats = statsResult.rows[0];

        res.json({
            totalQuestions: parseInt(totalQuestions.rows[0].count),
            totalAttempted: parseInt(stats.total_attempted) || 0,
            correctlyAttempted: parseInt(stats.correctly_attempted) || 0,
            totalAnswers: parseInt(stats.total_answers) || 0,
            quizzesCompleted: parseInt(quizCount.rows[0].count),
        });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
