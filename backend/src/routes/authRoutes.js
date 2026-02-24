const express = require("express");
const { register } = require("../controllers/authController");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", authController.login);
router.get("/profile", authMiddleware, authController.getProfile);
router.post("/credit", authMiddleware, authController.addCreditData);
router.get("/score", authMiddleware, authController.getCreditScore);
router.get("/dashboard", authMiddleware, authController.getDashboard);
router.get("/history", authMiddleware, authController.getScoreHistory);
router.get("/loan-decision", authMiddleware, authController.getLoanDecision);
module.exports = router;