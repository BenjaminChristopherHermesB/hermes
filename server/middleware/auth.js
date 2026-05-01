const { verifyAccessToken } = require("../utils/jwt");
const pool = require("../config/db");

async function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyAccessToken(token);

        const userResult = await pool.query(
            "SELECT id, username, name, role, approved, banned, subject_access_mode FROM users WHERE id = $1",
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = userResult.rows[0];

        if (user.banned) {
            return res.status(403).json({ error: "Account has been banned", code: "BANNED" });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
        }
        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        
        console.error("Auth middleware error:", err);
        return res.status(500).json({ error: "Internal server error during authentication" });
    }
}

module.exports = auth;
