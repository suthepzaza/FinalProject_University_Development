const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/terms");
router.use(auth, requireRole("advisor"));
router.get("/:code", controller.status);
router.post("/:code/finalize", controller.finalize);
module.exports = router;
