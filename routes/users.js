const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// GET /api/users - List all users (or filter by ?role=...)
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== "all") {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users: " + err.message });
  }
});

// POST /api/users - Admin create user
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role, studentId, active } = req.body;
    
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: "Email is already in use." });
    }

    const { generateRandomId } = require("../utils/randomId");
    const idToUse = studentId || generateRandomId();

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "student",
      studentId: idToUse,
      active: active !== false
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      active: user.active
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/users/:id - Update user details or toggle status
router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select("-password");

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Admin delete user
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    // Safety constraint: Never leave 0 admins
    if (userToDelete.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last remaining administrator." });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

