const { auth, requireRole } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/registrations");
const router = express.Router();
router.use(auth);
router.get("/", requireRole("advisor"), controller.list);
router.post("/", requireRole("advisor"), controller.create);
router.delete("/:id", requireRole("advisor"), controller.remove);
module.exports = router;
