const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1️⃣ Check if user exists
    const [existingUser] = await db.query(
      "SELECT * FROM Users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Insert user
    const [result] = await db.query(
      "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Login function
const pool = require("../config/db");


// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check if user exists
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = users[0];

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4️⃣ Send response
    res.json({
      message: "Login successful",
      token,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, name, email FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADD CREDIT DATA
// ADD CREDIT DATA + SAVE SCORE
exports.addCreditData = async (req, res) => {
  try {
    const { income, loan_amount, credit_utilization, payment_history } = req.body;

    // 🔢 Calculate score first
    let score = 300;
    score += Math.min(income / 1000, 200);
    score -= Math.min(loan_amount / 500, 200);
    score -= Math.min(credit_utilization * 1.5, 150);
    score += Math.min(payment_history * 2.5, 250);
    score = Math.max(300, Math.min(900, Math.round(score)));

    // 💾 Save data WITH score
    await pool.query(
      `INSERT INTO credit_data 
      (user_id, income, loan_amount, credit_utilization, payment_history, credit_score)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        income,
        loan_amount,
        credit_utilization,
        payment_history,
        score
      ]
    );

    res.json({
      message: "Credit data added successfully",
      credit_score: score
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// CALCULATE CREDIT SCORE
exports.getCreditScore = async (req, res) => {
  try {
    const [data] = await pool.query(
      "SELECT * FROM credit_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "No credit data found" });
    }

    const credit = data[0];

    // 🔢 Score Calculation
    let score = 300;

    // Income factor (max +200)
    score += Math.min(credit.income / 1000, 200);

    // Loan factor (max -200)
    score -= Math.min(credit.loan_amount / 500, 200);

    // Credit utilization (max -150)
    score -= Math.min(credit.credit_utilization * 1.5, 150);

    // Payment history (max +250)
    score += Math.min(credit.payment_history * 2.5, 250);

    // Clamp score between 300–900
    score = Math.max(300, Math.min(900, Math.round(score)));

    // Risk Level
    let risk = "High";
    if (score >= 750) risk = "Low";
    else if (score >= 600) risk = "Medium";

    res.json({
      credit_score: score,
      risk_level: risk
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// DASHBOARD
exports.getDashboard = async (req, res) => {
  try {
    const [data] = await pool.query(
      "SELECT * FROM credit_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "No credit data found" });
    }

    const credit = data[0];

    let score = 300;
    score += Math.min(credit.income / 1000, 200);
    score -= Math.min(credit.loan_amount / 500, 200);
    score -= Math.min(credit.credit_utilization * 1.5, 150);
    score += Math.min(credit.payment_history * 2.5, 250);
    score = Math.max(300, Math.min(900, Math.round(score)));

    let risk = "High";
    if (score >= 750) risk = "Low";
    else if (score >= 600) risk = "Medium";

    // 💡 Suggestions
    let suggestions = [];

    if (credit.credit_utilization > 30)
      suggestions.push("Reduce credit utilization below 30%");
    if (credit.loan_amount > credit.income * 0.5)
      suggestions.push("Lower outstanding loan amount");
    if (credit.payment_history < 80)
      suggestions.push("Improve payment consistency");

    res.json({
      credit_score: score,
      risk_level: risk,
      financial_snapshot: {
        income: credit.income,
        loan_amount: credit.loan_amount,
        credit_utilization: credit.credit_utilization,
        payment_history: credit.payment_history
      },
      suggestions
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// GET SCORE HISTORY
exports.getScoreHistory = async (req, res) => {
  try {
    const [history] = await pool.query(
      `SELECT credit_score, created_at 
       FROM credit_data 
       WHERE user_id = ? 
       ORDER BY created_at ASC`,
      [req.user.id]
    );

    res.json(history);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// LOAN APPROVAL ENGINE
exports.getLoanDecision = async (req, res) => {
  try {
    const [data] = await pool.query(
      "SELECT * FROM credit_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "No credit data found" });
    }

    const credit = data[0];
    const score = credit.credit_score;

    const debtToIncome = credit.loan_amount / credit.income;

    let approvalProbability = 0;
    let decision = "Rejected";
    let maxEligibleLoan = 0;

    if (score >= 750) {
      approvalProbability = 90;
      decision = "Approved";
      maxEligibleLoan = credit.income * 5;
    } 
    else if (score >= 600) {
      approvalProbability = 65;
      decision = "Under Review";
      maxEligibleLoan = credit.income * 3;
    } 
    else {
      approvalProbability = 25;
      decision = "Rejected";
      maxEligibleLoan = credit.income * 1;
    }

    // Reduce probability if debt-to-income too high
    if (debtToIncome > 0.5) {
      approvalProbability -= 20;
    }

    approvalProbability = Math.max(5, approvalProbability);

    res.json({
      credit_score: score,
      approval_probability: approvalProbability + "%",
      decision,
      max_eligible_loan: maxEligibleLoan
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};