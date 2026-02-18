const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const approved = require("../middleware/approved");

const router = express.Router();

router.use(auth);
router.use(approved);

router.post("/start", async (req, res) => {
    try {
        const { subjectId, questionCount, isTimed, timerMode, timePerQuestion, totalTime, showFeedback } = req.body;

        if (!subjectId || !questionCount) {
            return res.status(400).json({ error: "Subject ID and question count are required" });
        }

        const count = Math.min(Math.max(parseInt(questionCount), 10), 100);

        const totalAvailable = await pool.query(
            "SELECT COUNT(*) FROM questions WHERE subject_id = $1",
            [subjectId]
        );

        if (parseInt(totalAvailable.rows[0].count) === 0) {
            return res.status(404).json({ error: "No questions found for this subject" });
        }

        const actualCount = Math.min(count, parseInt(totalAvailable.rows[0].count));

        const questionsResult = await pool.query(
            `SELECT q.id, q.question, q.options, q.module
      FROM questions q
      LEFT JOIN user_question_stats uqs ON q.id = uqs.question_id AND uqs.user_id = $1
      WHERE q.subject_id = $2
      ORDER BY
        CASE
          WHEN uqs.id IS NULL THEN 0
          WHEN uqs.times_correct = 0 THEN 1
          ELSE 2
        END,
        RANDOM()
      LIMIT $3`,
            [req.user.id, subjectId, actualCount]
        );

        const effectiveTimePerQuestion = timerMode === "per-question" ? timePerQuestion : null;

        const session = await pool.query(
            `INSERT INTO quiz_sessions (user_id, subject_id, total_questions, is_timed, time_per_question)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [req.user.id, subjectId, actualCount, !!isTimed, effectiveTimePerQuestion]
        );

        const questions = questionsResult.rows.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            module: q.module,
        }));

        res.json({
            sessionId: session.rows[0].id,
            totalQuestions: actualCount,
            isTimed: !!isTimed,
            timerMode: isTimed ? (timerMode || "per-question") : null,
            timePerQuestion: effectiveTimePerQuestion,
            totalTime: timerMode === "block" ? totalTime : null,
            showFeedback: showFeedback !== false,
            questions,
        });
    } catch (err) {
        console.error("Start quiz error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/start-wrong", async (req, res) => {
    try {
        const { subjectId, isTimed, timerMode, timePerQuestion, totalTime, showFeedback } = req.body;

        if (!subjectId) {
            return res.status(400).json({ error: "Subject ID is required" });
        }

        const wrongQuestions = await pool.query(
            `SELECT DISTINCT q.id, q.question, q.options, q.module
       FROM questions q
       JOIN user_question_stats uqs ON q.id = uqs.question_id AND uqs.user_id = $1
       WHERE q.subject_id = $2
         AND uqs.times_attempted > uqs.times_correct
       ORDER BY RANDOM()
       LIMIT 100`,
            [req.user.id, subjectId]
        );

        if (wrongQuestions.rows.length === 0) {
            return res.status(404).json({ error: "No wrong questions found for this subject" });
        }

        const actualCount = wrongQuestions.rows.length;
        const effectiveTimePerQuestion = timerMode === "per-question" ? timePerQuestion : null;

        const session = await pool.query(
            `INSERT INTO quiz_sessions (user_id, subject_id, total_questions, is_timed, time_per_question)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [req.user.id, subjectId, actualCount, !!isTimed, effectiveTimePerQuestion]
        );

        const questions = wrongQuestions.rows.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            module: q.module,
        }));

        const computedTotalTime = timerMode === "block" ? totalTime : null;

        res.json({
            sessionId: session.rows[0].id,
            totalQuestions: actualCount,
            isTimed: !!isTimed,
            timerMode: isTimed ? (timerMode || "per-question") : null,
            timePerQuestion: effectiveTimePerQuestion,
            totalTime: computedTotalTime,
            showFeedback: showFeedback !== false,
            questions,
        });
    } catch (err) {
        console.error("Start wrong quiz error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/wrong-count/:subjectId", async (req, res) => {
    try {
        const { subjectId } = req.params;
        const result = await pool.query(
            `SELECT COUNT(DISTINCT q.id) AS count
       FROM questions q
       JOIN user_question_stats uqs ON q.id = uqs.question_id AND uqs.user_id = $1
       WHERE q.subject_id = $2
         AND uqs.times_attempted > uqs.times_correct`,
            [req.user.id, subjectId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error("Wrong count error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/submit", async (req, res) => {
    try {
        const { sessionId, questionId, selectedAnswer, showFeedback, timeTaken } = req.body;

        if (!sessionId || !questionId) {
            return res.status(400).json({ error: "Session ID and question ID are required" });
        }

        const session = await pool.query(
            "SELECT * FROM quiz_sessions WHERE id = $1 AND user_id = $2 AND completed_at IS NULL",
            [sessionId, req.user.id]
        );

        if (session.rows.length === 0) {
            return res.status(404).json({ error: "Active quiz session not found" });
        }

        const question = await pool.query(
            "SELECT * FROM questions WHERE id = $1",
            [questionId]
        );

        if (question.rows.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        const q = question.rows[0];
        const isCorrect = selectedAnswer === q.correct_answer;

        const existing = await pool.query(
            "SELECT id, is_correct FROM quiz_answers WHERE session_id = $1 AND question_id = $2",
            [sessionId, questionId]
        );

        if (existing.rows.length > 0) {
            const wasCorrect = existing.rows[0].is_correct;
            await pool.query(
                "UPDATE quiz_answers SET selected_answer = $1, is_correct = $2, time_taken = $3, answered_at = NOW() WHERE id = $4",
                [selectedAnswer || null, isCorrect, timeTaken || null, existing.rows[0].id]
            );

            if (wasCorrect && !isCorrect) {
                await pool.query(
                    "UPDATE quiz_sessions SET correct_count = correct_count - 1 WHERE id = $1",
                    [sessionId]
                );
            } else if (!wasCorrect && isCorrect) {
                await pool.query(
                    "UPDATE quiz_sessions SET correct_count = correct_count + 1 WHERE id = $1",
                    [sessionId]
                );
            }
        } else {
            await pool.query(
                "INSERT INTO quiz_answers (session_id, question_id, selected_answer, is_correct, time_taken) VALUES ($1, $2, $3, $4, $5)",
                [sessionId, questionId, selectedAnswer || null, isCorrect, timeTaken || null]
            );

            if (isCorrect) {
                await pool.query(
                    "UPDATE quiz_sessions SET correct_count = correct_count + 1 WHERE id = $1",
                    [sessionId]
                );
            }
        }

        await pool.query(
            `INSERT INTO user_question_stats (user_id, question_id, times_attempted, times_correct, last_attempted_at)
      VALUES ($1, $2, 1, $3, NOW())
      ON CONFLICT (user_id, question_id)
      DO UPDATE SET
        times_attempted = user_question_stats.times_attempted + 1,
        times_correct = user_question_stats.times_correct + $3,
        last_attempted_at = NOW()`,
            [req.user.id, questionId, isCorrect ? 1 : 0]
        );

        if (showFeedback === false) {
            res.json({ saved: true });
        } else {
            res.json({
                isCorrect,
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
            });
        }
    } catch (err) {
        console.error("Submit answer error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/complete", async (req, res) => {
    try {
        const { sessionId } = req.body;

        const result = await pool.query(
            `UPDATE quiz_sessions SET completed_at = NOW()
      WHERE id = $1 AND user_id = $2 AND completed_at IS NULL
      RETURNING *`,
            [sessionId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active quiz session not found" });
        }

        const session = result.rows[0];

        const timeResult = await pool.query(
            "SELECT COALESCE(SUM(time_taken), 0) AS total_time, COALESCE(AVG(time_taken), 0) AS avg_time FROM quiz_answers WHERE session_id = $1 AND time_taken IS NOT NULL",
            [sessionId]
        );

        res.json({
            sessionId: session.id,
            totalQuestions: session.total_questions,
            correctCount: session.correct_count,
            score: Math.round((session.correct_count / session.total_questions) * 100),
            completedAt: session.completed_at,
            totalTimeTaken: parseInt(timeResult.rows[0].total_time),
            avgTimePerQuestion: Math.round(parseFloat(timeResult.rows[0].avg_time)),
        });
    } catch (err) {
        console.error("Complete quiz error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/review/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await pool.query(
            "SELECT * FROM quiz_sessions WHERE id = $1 AND user_id = $2",
            [sessionId, req.user.id]
        );

        if (session.rows.length === 0) {
            return res.status(404).json({ error: "Quiz session not found" });
        }

        const answers = await pool.query(
            `SELECT qa.*, q.question, q.options, q.correct_answer, q.explanation, q.module
      FROM quiz_answers qa
      JOIN questions q ON q.id = qa.question_id
      WHERE qa.session_id = $1
      ORDER BY qa.answered_at`,
            [sessionId]
        );

        const timeResult = await pool.query(
            "SELECT COALESCE(SUM(time_taken), 0) AS total_time, COALESCE(AVG(time_taken), 0) AS avg_time FROM quiz_answers WHERE session_id = $1 AND time_taken IS NOT NULL",
            [sessionId]
        );

        res.json({
            session: session.rows[0],
            answers: answers.rows,
            totalTimeTaken: parseInt(timeResult.rows[0].total_time),
            avgTimePerQuestion: Math.round(parseFloat(timeResult.rows[0].avg_time)),
        });
    } catch (err) {
        console.error("Review quiz error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/history", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            "SELECT COUNT(*) FROM quiz_sessions WHERE user_id = $1",
            [req.user.id]
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT qs.*, s.name AS subject_name
      FROM quiz_sessions qs
      JOIN subjects s ON s.id = qs.subject_id
      WHERE qs.user_id = $1
      ORDER BY qs.started_at DESC
      LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        res.json({
            sessions: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Quiz history error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
