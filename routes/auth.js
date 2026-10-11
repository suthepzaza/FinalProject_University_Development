const { auth } = require("../middleware/auth");
const express = require("express");
const controller = require("../controllers/auth");
const router = express.Router();
router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/signup", controller.register);
router.get("/me", auth, controller.me);
module.exports = router;
