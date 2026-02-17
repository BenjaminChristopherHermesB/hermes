const jwt = require("jsonwebtoken");

function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );
}

function generateRefreshToken(user, stayLoggedIn) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: stayLoggedIn ? "30d" : "1d" }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
