const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/score/breakdown
router.get("/breakdown", authMiddleware, scoreController.getScoreBreakdown);

module.exports = router;
