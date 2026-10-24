
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        vendor: {
            type: String,
            trim: true,
            default: "Unknown"
        },

        invoiceNumber: {
            type: String,
            trim: true,
            default: null
        },

        date: {
            type: String,
            default: null
        },

        total: {
            type: Number,
            min: 0,
            default: 0
        },

        items: {
            type: [String],
            default: []
        },

        // Supports both standard and user-created categories.
        category: {
            type: String,
            trim: true,
            default: "Uncategorized"
        },

        // Records whether the category was confirmed by the user.
        categoryStatus: {
            type: String,
            enum: [
                "AI Suggested",
                "User Confirmed",
                "Uncategorized"
            ],
            default: "Uncategorized"
        },

        status: {
            type: String,
            enum: [
                "Uploaded",
                "Processing",
                "Processed",
                "Needs Review",
                "Failed"
            ],
            default: "Uploaded"
        },

        fileName: {
            type: String,
            required: true
        },

        filePath: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
