const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", authLimiter, async (req, res) => {
    try {
        const { username, password, name } = req.body;

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

        const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.connection.remoteAddress;

        const ipCheck = await pool.query(
            "SELECT id, role FROM users WHERE ip_address = $1",
            [clientIp]
        );
        const nonAdminFromIp = ipCheck.rows.filter((u) => u.role !== "admin");
        if (nonAdminFromIp.length > 0) {
            return res.status(409).json({ error: "Only one account per IP address is allowed" });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            "INSERT INTO users (username, password_hash, name, ip_address) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role",
            [username, passwordHash, name, clientIp]
        );

        const user = result.rows[0];
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user, false);

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, expiresAt]
        );

        res.status(201).json({
            user: { id: user.id, username: user.username, name: user.name, role: user.role },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/login", authLimiter, async (req, res) => {
    try {
        const { username, password, stayLoggedIn } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user, !!stayLoggedIn);

        const expiresAt = stayLoggedIn
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, expiresAt]
        );

        res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                theme_preference: user.theme_preference,
            },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token required" });
        }

        const tokenRecord = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
            [refreshToken]
        );
        if (tokenRecord.rows.length === 0) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        const decoded = verifyRefreshToken(refreshToken);
        const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = userResult.rows[0];
        const newAccessToken = generateAccessToken(user);

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.error("Refresh error:", err);
        res.status(401).json({ error: "Invalid refresh token" });
    }
});

router.post("/logout", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
        }
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
