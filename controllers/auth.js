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

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password, studentId, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }
        const cleanEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }

        const assignedRole = (role === "admin" || role === "advisor") ? role : "student";
        let sid = studentId ? studentId.trim() : null;
        if (assignedRole === "student" && !sid) {
            sid = "STU" + Math.floor(100000 + Math.random() * 900000);
        }
        if (sid) {
            const existingSid = await User.findOne({ studentId: sid });
            if (existingSid) {
                return res.status(409).json({ error: "Student ID is already registered" });
            }
        }

        const user = await User.create({
            name: name.trim(),
            email: cleanEmail,
            password,
            role: assignedRole,
            studentId: sid,
            active: true
        });

        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ error: "Authentication is not configured" });
        const token = jwt.sign(
            { id: user._id, role: user.role },
            secret,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Registration failed: " + error.message });
    }
};
