const { auth } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/auth");
const router = express.Router();
router.post("/login", controller.login);
router.get("/me", auth, controller.me);
module.exports = router;
