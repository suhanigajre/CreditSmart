exports.getScoreBreakdown = async (req, res) => {
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
    const utilization = credit.credit_utilization;
    const paymentHistory = credit.payment_history;

    // Factor evaluation
    const breakdown = {
      payment_history: {
        weight: "35%",
        value: paymentHistory,
        status: paymentHistory >= 95 ? "Excellent" :
                paymentHistory >= 80 ? "Good" : "Needs Improvement"
      },
      credit_utilization: {
        weight: "30%",
        value: utilization + "%",
        status: utilization <= 30 ? "Healthy" :
                utilization <= 50 ? "Moderate" : "High"
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

    // Strengths & Weaknesses
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
    res.status(500).json({ message: "Server error" });
  }
};