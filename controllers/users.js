const User = require("../models/User");

// GET /api/users - List all users (or filter by ?role=...)
exports.list = async (req, res) => {
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
};

// POST /api/users - Admin create user
exports.create = async (req, res) => {
  try {
    const { name, email, password, role, studentId, active, advisorId } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role: role || "student",
      studentId,
      advisorId, active: active !== false
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      advisorId: user.advisorId, active: user.active
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PATCH /api/users/:id - Update user details or toggle status
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin" && (req.body.role && req.body.role !== "admin" || req.body.active === false)) {
      if (await User.countDocuments({ role: "admin", active: true }) <= 1) {
        return res.status(400).json({ error: "Cannot remove the last active administrator" });
      }
    }
    const allowed = ["name", "email", "password", "role", "studentId", "advisorId", "active"];
    for (const key of allowed) if (Object.hasOwn(req.body, key)) user[key] = req.body[key];
    await user.save();
    const result = user.toObject();
    delete result.password;
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/users/:id - Admin delete user
exports.remove = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    if (String(userToDelete._id) === req.user.id) return res.status(400).json({ error: "Cannot delete your own account" });
    // Never leave zero admins
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
};
