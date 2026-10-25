const express = require("express");
const router = express.Router();

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

router.post("/predict", async (req, res) => {
    try {
        const { description } = req.body;

        if (!description || !description.trim()) {
            return res.status(400).json({
                message: "Description is required",
            });
        }

        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                description: description.trim(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.json(data);
    } catch (error) {
        console.error("ML service error:", error.message);

        return res.status(500).json({
            message:
                "ML service unavailable. Make sure the FastAPI service is running.",
        });
    }
});

module.exports = router;