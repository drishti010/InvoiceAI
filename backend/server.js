require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const mlRoutes = require("./ml/mlRoutes");

dotenv.config();

connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("AI Invoice Backend is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/ml", mlRoutes);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});