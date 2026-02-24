const pool = require("../config/db"); // Make sure pool is imported

// GET /api/score/breakdown
exports.getScoreBreakdown = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const [data] = await pool.query(
      "SELECT * FROM credit_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: "No credit data found" });
    }

    const credit = data[0];
    const score = credit.credit_score;
    const utilization = credit.credit_utilization;
    const paymentHistory = credit.payment_history;

    const breakdown = {
      payment_history: {
        weight: "35%",
        value: paymentHistory,
        status:
          paymentHistory >= 95
            ? "Excellent"
            : paymentHistory >= 80
            ? "Good"
            : "Needs Improvement"
      },
      credit_utilization: {
        weight: "30%",
        value: utilization + "%",
        status:
          utilization <= 30
            ? "Healthy"
            : utilization <= 50
            ? "Moderate"
            : "High"
      },
      length_of_history: {
        weight: "15%",
        value: "Moderate (Simulated)",
        status: "Average"
      },
      credit_mix: {
        weight: "10%",
        value: "2 Active Accounts (Simulated)",
        status: "Good"
      },
      new_credit_inquiries: {
        weight: "10%",
        value: "1 Recent Inquiry (Simulated)",
        status: "Low Impact"
      }
    };

    const strengths = [];
    const weaknesses = [];

    if (paymentHistory >= 90) strengths.push("Strong payment history");
    else weaknesses.push("Improve on-time payments");

    if (utilization <= 30) strengths.push("Low credit utilization");
    else weaknesses.push("Reduce credit utilization below 30%");

    res.json({
      credit_score: score,
      breakdown,
      strengths,
      weaknesses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/score/simulate
exports.simulateScore = (req, res) => {
  try {
    const { new_payment_history, new_credit_utilization, new_loan_amount } = req.body;

    // Current simulated user data
    const current = {
      payment_history: 90,
      credit_utilization: 30,
      loan_amount: 10000
    };

    // Apply "what-if" scenario
    const paymentHistory = new_payment_history ?? current.payment_history;
    const creditUtilization = new_credit_utilization ?? current.credit_utilization;
    const loanAmount = new_loan_amount ?? current.loan_amount;

    // Weighted scoring (mapped to 300–850)
    const score = Math.round(
      300 + // minimum base
      paymentHistory * 1.8 * 0.35 +              // payment history contribution
      (100 - creditUtilization) * 1.8 * 0.30 +  // utilization contribution
      75 * 1.8 * 0.15 +                          // length of history
      70 * 1.8 * 0.10 +                          // credit mix
      90 * 1.8 * 0.10                             // new credit inquiries
    );

    // Risk level mapping
    let risk_level = "Low";
    if (score < 600) risk_level = "High";
    else if (score < 700) risk_level = "Medium";

    res.json({
      simulated_score: score,
      risk_level,
      details: {
        payment_history: paymentHistory,
        credit_utilization: creditUtilization,
        loan_amount: loanAmount
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};