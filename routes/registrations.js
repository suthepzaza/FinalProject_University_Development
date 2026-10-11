const { auth, requireRole } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/registrations");
const router = express.Router();
router.use(auth);
router.get("/", requireRole("advisor", "student", "admin"), controller.list);
router.post("/", requireRole("advisor", "student", "admin"), controller.create);
router.delete("/:id", requireRole("advisor", "student", "admin"), controller.remove);
module.exports = router;
