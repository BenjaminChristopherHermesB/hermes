require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function seedAdmin() {
    try {
        const password = "Benjamin1312!";
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (username, password_hash, name, role, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $4
       RETURNING id, username, role`,
            ["bchbenjamin", hash, "Benjamin", "admin", "0.0.0.0"]
        );

        console.log("Admin seeded:", result.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seedAdmin();
