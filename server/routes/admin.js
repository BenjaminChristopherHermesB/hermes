const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();

router.use(auth);
router.use(admin);

router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, username, name, role, approved, banned, ip_address, theme_preference, created_at FROM users ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/users/:id/role", async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
        }

        const result = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, name, role, approved, banned",
            [role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update role error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/users/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;

        const result = await pool.query(
            "UPDATE users SET approved = $1 WHERE id = $2 RETURNING id, username, name, role, approved, banned",
            [!!approved, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update approval error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/users/:id/ban", async (req, res) => {
    try {
        const { id } = req.params;
        const { banned } = req.body;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: "Cannot ban your own account" });
        }

        const result = await pool.query(
            "UPDATE users SET banned = $1 WHERE id = $2 RETURNING id, username, name, role, approved, banned",
            [!!banned, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        if (banned) {
            await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update ban error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/users/create", async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: "Username, password, and name are required" });
        }
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: "Username must be 3-50 characters" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username already taken" });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const userRole = role === "admin" ? "admin" : "user";

        const result = await pool.query(
            "INSERT INTO users (username, password_hash, name, role, approved) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, username, name, role, approved, banned, created_at",
            [username, passwordHash, name, userRole]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Create user error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/users/:id/reset-password", async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const result = await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, username, name",
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);

        res.json({ message: "Password reset successfully", user: result.rows[0] });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, username", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deleted", user: result.rows[0] });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/subjects/upload", async (req, res) => {
    try {
        const { subject, questions } = req.body;

        if (!subject || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: "Subject name and questions array are required" });
        }

        const existing = await pool.query("SELECT id FROM subjects WHERE name = $1", [subject]);

        let subjectId;
        let merged = false;

        if (existing.rows.length > 0) {
            const { merge } = req.body;
            if (merge === undefined) {
                return res.status(409).json({
                    error: "Subject already exists",
                    existingSubjectId: existing.rows[0].id,
                    message: "Subject already exists. Send merge: true to merge questions, or merge: false to skip.",
                    requiresMerge: true,
                });
            }
            if (!merge) {
                return res.status(200).json({ message: "Upload skipped, subject already exists" });
            }
            subjectId = existing.rows[0].id;
            merged = true;
        } else {
            const newSubject = await pool.query(
                "INSERT INTO subjects (name) VALUES ($1) RETURNING id",
                [subject]
            );
            subjectId = newSubject.rows[0].id;
        }

        let inserted = 0;
        let duplicates = 0;

        for (const q of questions) {
            if (!q.question || !q.options || !q.correct_answer || !q.module) {
                continue;
            }
            try {
                await pool.query(
                    "INSERT INTO questions (subject_id, question, options, correct_answer, explanation, module) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (subject_id, question) DO NOTHING",
                    [subjectId, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation || null, q.module]
                );
                inserted++;
            } catch (insertErr) {
                if (insertErr.code === "23505") {
                    duplicates++;
                } else {
                    console.error("Question insert error:", insertErr);
                }
            }
        }

        if (merged) {
            await pool.query("UPDATE subjects SET updated_at = NOW() WHERE id = $1", [subjectId]);
        }

        res.status(201).json({
            message: merged ? "Questions merged successfully" : "Subject created successfully",
            subjectId,
            inserted,
            duplicates,
            total: questions.length,
        });
    } catch (err) {
        console.error("Upload subject error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/subjects/:id/export", async (req, res) => {
    try {
        const { id } = req.params;

        const subjectResult = await pool.query("SELECT * FROM subjects WHERE id = $1", [id]);
        if (subjectResult.rows.length === 0) {
            return res.status(404).json({ error: "Subject not found" });
        }

        const questionsResult = await pool.query(
            "SELECT question, options, correct_answer, explanation, module FROM questions WHERE subject_id = $1 ORDER BY module, id",
            [id]
        );

        res.json({
            subject: subjectResult.rows[0].name,
            questions: questionsResult.rows,
        });
    } catch (err) {
        console.error("Export subject error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.delete("/subjects/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM subjects WHERE id = $1 RETURNING id, name", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Subject not found" });
        }
        res.json({ message: "Subject deleted", subject: result.rows[0] });
    } catch (err) {
        console.error("Delete subject error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.delete("/quizzes/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM quiz_sessions WHERE id = $1 RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Quiz session not found" });
        }
        res.json({ message: "Quiz session deleted" });
    } catch (err) {
        console.error("Delete quiz error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/stats", async (req, res) => {
    try {
        const users = await pool.query("SELECT COUNT(*) FROM users");
        const pendingUsers = await pool.query("SELECT COUNT(*) FROM users WHERE approved = FALSE AND banned = FALSE");
        const bannedUsers = await pool.query("SELECT COUNT(*) FROM users WHERE banned = TRUE");
        const subjects = await pool.query("SELECT COUNT(*) FROM subjects");
        const questions = await pool.query("SELECT COUNT(*) FROM questions");
        const quizzes = await pool.query("SELECT COUNT(*) FROM quiz_sessions");

        res.json({
            totalUsers: parseInt(users.rows[0].count),
            pendingUsers: parseInt(pendingUsers.rows[0].count),
            bannedUsers: parseInt(bannedUsers.rows[0].count),
            totalSubjects: parseInt(subjects.rows[0].count),
            totalQuestions: parseInt(questions.rows[0].count),
            totalQuizzes: parseInt(quizzes.rows[0].count),
        });
    } catch (err) {
        console.error("Admin stats error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
