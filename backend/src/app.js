const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use("/api/score", scoreRoutes);
app.get("/", (req, res) => {
  res.send("CreditSmart Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});