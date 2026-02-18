const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const approved = require("../middleware/approved");

const router = express.Router();

router.use(auth);
router.use(approved);

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT s.id, s.name, s.created_at, s.updated_at,
        COUNT(q.id) AS question_count,
        COUNT(DISTINCT q.module) AS module_count
      FROM subjects s
      LEFT JOIN questions q ON q.subject_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `);

        const subjects = result.rows.map((s) => ({
            ...s,
            question_count: parseInt(s.question_count),
            module_count: parseInt(s.module_count),
        }));

        for (const subject of subjects) {
            const statsResult = await pool.query(
                `SELECT
          COUNT(DISTINCT uqs.question_id) AS attempted,
          COUNT(DISTINCT CASE WHEN uqs.times_correct > 0 THEN uqs.question_id END) AS mastered
        FROM user_question_stats uqs
        JOIN questions q ON q.id = uqs.question_id
        WHERE uqs.user_id = $1 AND q.subject_id = $2`,
                [req.user.id, subject.id]
            );
            subject.attempted = parseInt(statsResult.rows[0].attempted);
            subject.mastered = parseInt(statsResult.rows[0].mastered);
        }

        res.json(subjects);
    } catch (err) {
        console.error("Get subjects error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
