const { auth, requireRole } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/users");
const router = express.Router();
router.get("/", auth, requireRole("admin"), controller.list);
router.post("/", auth, requireRole("admin"), controller.create);
router.patch("/:id", auth, requireRole("admin"), controller.update);
router.delete("/:id", auth, requireRole("admin"), controller.remove);
module.exports = router;
