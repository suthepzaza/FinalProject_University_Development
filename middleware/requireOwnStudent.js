module.exports = (req, res, next) => {
    if (req.user.role === "advisor") return next();
    if (req.user.role === "student" &&
        (req.params.id === req.user.id ||
         (req.user.studentId && req.params.id === req.user.studentId))) {
        return next();
    }
    return res.status(403).json({ error: "Forbidden" });
};
