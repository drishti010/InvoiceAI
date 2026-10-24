
const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");
const Invoice = require("../models/Invoice");
const PendingInvoice = require("../models/PendingInvoice");

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

function getAuthenticatedUserId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id ||
        req.user?.sub
    );
}

const KNOWN_CATEGORIES = [
    "IT",
    "Travel",
    "Food",
    "Office",
    "Other"
];

function normalizeCategory(category) {
    if (typeof category !== "string" || !category.trim()) {
        return "Uncategorized";
    }

    const trimmed = category.trim();

    const known = KNOWN_CATEGORIES.find(
        item => item.toLowerCase() === trimmed.toLowerCase()
    );

    // Permit custom categories as well as standard categories.
    return known || trimmed;
}

function getValidationErrors(data) {
    const errors = [];

    if (!data.vendor || data.vendor === "Unknown") {
        errors.push("Vendor not detected. Please review it.");
    }

    if (!data.invoiceNumber) {
        errors.push("Invoice number not detected. Please review it.");
    }

    if (!data.date) {
        errors.push("Invoice date not detected. Please review it.");
    }

    if (
        data.total == null ||
        !Number.isFinite(Number(data.total)) ||
        Number(data.total) <= 0
    ) {
        errors.push("A valid invoice total was not detected.");
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push("Invoice items were not detected.");
    }

    return errors;
}

// STEP 1: Upload the invoice, extract details, and store a pending record.
router.post(
    "/upload",
    authMiddleware,
    upload.single("invoice"),
    async (req, res) => {
        let pending = null;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "Please select an invoice file."
                });
            }

            const userId = getAuthenticatedUserId(req);

            if (!userId) {
                return res.status(401).json({
                    message: "User identity is missing. Please log in again."
                });
            }

            const absoluteFilePath = path.resolve(req.file.path);
            const formData = new FormData();

            formData.append(
                "invoice",
                fs.createReadStream(absoluteFilePath),
                req.file.originalname
            );

            const mlResponse = await axios.post(
                "http://127.0.0.1:8000/process-invoice",
                formData,
                {
                    headers: formData.getHeaders(),
                    maxBodyLength: Infinity,
                    timeout: 120000
                }
            );

            const extracted = mlResponse.data || {};

            const extractedInvoice = {
                vendor: extracted.vendor || "Unknown",
                invoiceNumber: extracted.invoiceNumber || null,
                date: extracted.date || null,
                total:
                    extracted.total == null
                        ? null
                        : Number(extracted.total),
                items: Array.isArray(extracted.items)
                    ? extracted.items
                    : [],
                predictedCategory: normalizeCategory(
                    extracted.category
                ),
                validationErrors: []
            };

            extractedInvoice.validationErrors = [
                ...new Set([
                    ...(Array.isArray(extracted.validationErrors)
                        ? extracted.validationErrors
                        : []),
                    ...getValidationErrors(extractedInvoice)
                ])
            ];

            pending = await PendingInvoice.create({
                user: userId,
                ...extractedInvoice,
                fileName: req.file.originalname,
                filePath: absoluteFilePath
            });

            return res.status(200).json({
                message:
                    "Invoice extracted. Review its details before saving.",
                pendingUploadId: pending._id,
                extractedInvoice
            });
        } catch (error) {
            console.error(
                "Invoice extraction error:",
                error.response?.data || error.message
            );

            if (pending) {
                await PendingInvoice.deleteOne({
                    _id: pending._id,
                    user: getAuthenticatedUserId(req)
                }).catch(() => {});
            }

            return res.status(500).json({
                message:
                    error.response?.data?.detail ||
                    "Invoice extraction failed. Please try again."
            });
        }
    }
);

// STEP 2: Confirm extracted details and save the invoice.
router.post(
    "/confirm",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = getAuthenticatedUserId(req);

            if (!userId) {
                return res.status(401).json({
                    message: "User identity is missing. Please log in again."
                });
            }

            const {
                pendingUploadId,
                vendor,
                invoiceNumber,
                date,
                total,
                items,
                category
            } = req.body;

            if (!pendingUploadId) {
                return res.status(400).json({
                    message: "Pending upload ID is required."
                });
            }

            const pending = await PendingInvoice.findOne({
                _id: pendingUploadId,
                user: userId
            });

            if (!pending) {
                return res.status(404).json({
                    message:
                        "Pending upload not found or expired. Upload the invoice again."
                });
            }

            // Only use files stored inside this application's uploads directory.
            const uploadsDirectory = path.resolve(__dirname, "../uploads");
            const storedFilePath = path.resolve(pending.filePath);

            if (
                !storedFilePath.startsWith(uploadsDirectory + path.sep) ||
                !fs.existsSync(storedFilePath)
            ) {
                return res.status(400).json({
                    message:
                        "The uploaded file is unavailable. Please upload it again."
                });
            }

            const cleanedVendor =
                typeof vendor === "string" ? vendor.trim() : "";

            const cleanedNumber =
                typeof invoiceNumber === "string"
                    ? invoiceNumber.trim()
                    : "";

            const cleanedDate =
                typeof date === "string" ? date.trim() : "";

            const numericTotal = Number(total);

            if (
                !cleanedVendor ||
                !cleanedDate ||
                !Number.isFinite(numericTotal) ||
                numericTotal <= 0
            ) {
                return res.status(400).json({
                    message:
                        "Please enter a vendor, valid date, and positive total."
                });
            }

            if (items != null && !Array.isArray(items)) {
                return res.status(400).json({
                    message: "Invoice items must be a list."
                });
            }

            const cleanedItems = (items ?? pending.items)
                .filter(item => typeof item === "string")
                .map(item => item.trim())
                .filter(Boolean);

            const cleanedCategory = normalizeCategory(
                category || pending.predictedCategory
            );

            if (cleanedCategory.length > 80) {
                return res.status(400).json({
                    message: "Category must be 80 characters or fewer."
                });
            }

            // Avoid creating duplicate records for the same user and
            // invoice number. Update the existing record when appropriate.
            let savedInvoice;

            if (cleanedNumber) {
                savedInvoice = await Invoice.findOneAndUpdate(
                    {
                        user: userId,
                        invoiceNumber: cleanedNumber
                    },
                    {
                        $set: {
                            vendor: cleanedVendor,
                            date: cleanedDate,
                            total: numericTotal,
                            items: cleanedItems,
                            category: cleanedCategory,
                            categoryStatus: category
                                ? "User Confirmed"
                                : cleanedCategory === "Uncategorized"
                                    ? "Uncategorized"
                                    : "AI Suggested",
                            status: "Processed",
                            fileName: pending.fileName,
                            filePath: storedFilePath
                        },
                        $setOnInsert: {
                            user: userId,
                            invoiceNumber: cleanedNumber
                        }
                    },
                    {
                        new: true,
                        upsert: true,
                        runValidators: true,
                        setDefaultsOnInsert: true
                    }
                );
            } else {
                savedInvoice = await Invoice.create({
                    user: userId,
                    vendor: cleanedVendor,
                    invoiceNumber: null,
                    date: cleanedDate,
                    total: numericTotal,
                    items: cleanedItems,
                    category: cleanedCategory,
                    categoryStatus: category
                        ? "User Confirmed"
                        : cleanedCategory === "Uncategorized"
                            ? "Uncategorized"
                            : "AI Suggested",
                    status: "Processed",
                    fileName: pending.fileName,
                    filePath: storedFilePath
                });
            }

            await PendingInvoice.deleteOne({
                _id: pending._id,
                user: userId
            });

            return res.status(200).json({
                message: "Invoice saved successfully.",
                invoice: savedInvoice
            });
        } catch (error) {
            console.error(
                "Invoice confirmation error:",
                error.message
            );

            return res.status(500).json({
                message: "Unable to save the invoice. Please try again."
            });
        }
    }
);

// STEP 3: List invoices belonging to the logged-in user.
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                message: "User identity is missing. Please log in again."
            });
        }

        const invoices = await Invoice.find({
            user: userId
        }).sort({ createdAt: -1 });

        return res.status(200).json({ invoices });
    } catch (error) {
        console.error("Fetch invoices error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch invoices."
        });
    }
});


/* STEP 4: Edit an invoice belonging to the logged-in user. */
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Please log in again."
            });
        }

        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                message: "Invalid invoice ID."
            });
        }

        const { vendor, invoiceNumber, date, total, items, category } =
            req.body;

        if (
            typeof vendor !== "string" ||
            !vendor.trim() ||
            typeof date !== "string" ||
            !date.trim()
        ) {
            return res.status(400).json({
                message: "Vendor and date are required."
            });
        }

        const numericTotal = Number(total);

        if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
            return res.status(400).json({
                message: "Enter a valid positive invoice total."
            });
        }

        if (
            items !== undefined &&
            (!Array.isArray(items) ||
                !items.every(item => typeof item === "string"))
        ) {
            return res.status(400).json({
                message: "Invoice items must be a list of text values."
            });
        }

        const cleanedVendor = vendor.trim();
        const cleanedDate = date.trim();
        const cleanedNumber =
            typeof invoiceNumber === "string"
                ? invoiceNumber.trim()
                : "";

        const cleanedCategory = normalizeCategory(category);

        if (cleanedCategory.length > 80) {
            return res.status(400).json({
                message: "Category must be 80 characters or fewer."
            });
        }

        const updates = {
            vendor: cleanedVendor,
            invoiceNumber: cleanedNumber || null,
            date: cleanedDate,
            total: numericTotal,
            category: cleanedCategory,
            categoryStatus: "User Confirmed"
        };

        if (items !== undefined) {
            updates.items = items
                .map(item => item.trim())
                .filter(Boolean);
        }

        const invoice = await Invoice.findOneAndUpdate(
            {
                _id: id,
                user: userId
            },
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!invoice) {
            return res.status(404).json({
                message: "Invoice not found."
            });
        }

        return res.status(200).json({
            message: "Invoice updated successfully.",
            invoice
        });
    } catch (error) {
        console.error("Edit invoice error:", error.message);

        return res.status(500).json({
            message: "Unable to update the invoice."
        });
    }
});

/* STEP 4: Delete one invoice belonging to the logged-in user. */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Please log in again."
            });
        }

        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({
                message: "Invalid invoice ID."
            });
        }

        const invoice = await Invoice.findOneAndDelete({
            _id: id,
            user: userId
        });

        if (!invoice) {
            return res.status(404).json({
                message: "Invoice not found."
            });
        }

        return res.status(200).json({
            message: "Invoice deleted successfully.",
            deletedInvoiceId: invoice._id
        });
    } catch (error) {
        console.error("Delete invoice error:", error.message);

        return res.status(500).json({
            message: "Unable to delete the invoice."
        });
    }
});


module.exports = router;
