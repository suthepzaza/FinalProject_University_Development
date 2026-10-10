const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "No token provided"
        });
    }
    try {
        const token = header.split(" ")[1];
        const claims = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(claims.id).select("_id role active studentId email");
        if (!user || user.active === false) {
            return res.status(401).json({ error: "Account unavailable" });
        }
        // Use the current account role so role changes revoke old permissions.
        req.user = { id: String(user._id), role: user.role, studentId: user.studentId, email: user.email };
    } catch (error) {
        res.status(401).json({
            error: "Invalid token"
        });
        return;
    }
    next();
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Forbidden"
            });
        }
        next();
    };
};

const requireOwnStudent = (req, res, next) => {
    if (req.user.role === "advisor") return next();
    if (req.user.role === "student" &&
        (req.params.id === req.user.id ||
         (req.user.studentId && req.params.id === req.user.studentId))) {
        return next();
    }
    return res.status(403).json({ error: "Forbidden" });
};

module.exports = { auth, requireRole, requireOwnStudent };
