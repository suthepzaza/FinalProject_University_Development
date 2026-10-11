const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        const ok = user && await bcrypt.compare(password, user.password);
        if (!ok || user.active === false) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ error: "Authentication is not configured" });
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            secret,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name || user.email.split('@')[0],
                email: user.email,
                role: user.role || 'student',
                studentId: user.studentId || user.email.split('@')[0]
            }
        });
    } catch (error) {
        res.status(500).json({
            error: "Server error"
        });
    }
};

// GET /api/auth/me
exports.me = async (req, res) => {
    res.json({
        id: req.user.id,
        role: req.user.role
    });
};
