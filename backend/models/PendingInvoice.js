
const mongoose = require("mongoose");

const pendingInvoiceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
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
        predictedCategory: {
            type: String,
            trim: true,
            default: "Uncategorized"
        },
        validationErrors: {
            type: [String],
            default: []
        },
        fileName: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 60 * 1000),
            expires: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "PendingInvoice",
    pendingInvoiceSchema
);
