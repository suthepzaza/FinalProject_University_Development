const { auth, requireRole } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/me");
const router = express.Router();
router.use(auth, requireRole("student"));
router.get("/profile", controller.profile);
router.get("/registrations", controller.registrations);
router.get("/record", controller.record);
module.exports = router;
