const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const requireRole = require("../middleware/requireRole");
const router = express.Router();

// POST /api/auth/register
router.post("/register", auth, requireRole("admin"), async (req, res) => {
    try {
        const { name, email, password, studentId, role } = req.body;
        
        // 1. Check if email already registered
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({
                error: "This email is already registered. Please log in instead."
            });
        }

        // 2. Generate random 6-digit numeric studentId if not provided
        const { generateRandomId } = require("../utils/randomId");
        const numericId = studentId || generateRandomId();

        const user = await User.create({
            name: name || email.split('@')[0],
            email: email.toLowerCase().trim(),
            password,
            role: role || "student",
            studentId: numericId
        });

        res.status(201).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                error: "This email is already registered. Please log in instead."
            });
        }
        res.status(400).json({
            error: error.message
        });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
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
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
    res.json({
        id: req.user.id,
        role: req.user.role
    });
});

module.exports = router;