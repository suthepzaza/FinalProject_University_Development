const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "No token provided"
        });
    }
    try {
        const token = header.split(" ")[1];
        const claims = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(claims.id).select("_id role active studentId");
        if (!user || user.active === false) {
            return res.status(401).json({ error: "Account unavailable" });
        }
        // Use the current account role so role changes revoke old permissions.
        req.user = { id: String(user._id), role: user.role, studentId: user.studentId };
    } catch (error) {
        res.status(401).json({
            error: "Invalid token"
        });
        return;
    }
    next();
};
