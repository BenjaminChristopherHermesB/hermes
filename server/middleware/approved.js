function approved(req, res, next) {
    if (!req.user || !req.user.approved) {
        return res.status(403).json({ error: "Account pending admin approval", code: "NOT_APPROVED" });
    }
    next();
}

module.exports = approved;
