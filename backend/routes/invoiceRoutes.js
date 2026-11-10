
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

// ==================================================
// 1. AUTHENTICATED USER
// ==================================================

function getAuthenticatedUserId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id ||
        req.user?.sub
    );
}

// ==================================================
// 2. EXPENSE CATEGORIES
// ==================================================

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

    return known || trimmed;
}

// ==================================================
// 3. VALIDATE EXTRACTED INVOICE
// ==================================================

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

// ==================================================
// 4. ML SERVICE CONFIGURATION
// ==================================================

function getMLServiceEndpoint() {
    const serviceUrl = process.env.ML_SERVICE_URL;

    if (!serviceUrl || !serviceUrl.trim()) {
        throw new Error(
            "ML_SERVICE_URL is missing from backend environment variables."
        );
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(serviceUrl.trim());
    } catch {
        throw new Error("Invalid ML_SERVICE_URL configuration.");
    }

    if (
        parsedUrl.protocol !== "https:" &&
        parsedUrl.hostname !== "localhost" &&
        parsedUrl.hostname !== "127.0.0.1"
    ) {
        throw new Error("ML_SERVICE_URL must use HTTPS.");
    }

    // Remove trailing slash and construct the endpoint.
    return new URL(
        "/process-invoice",
        parsedUrl.origin
    ).toString();
}

// ==================================================
// 5. STEP 1: UPLOAD AND EXTRACT INVOICE
// ==================================================

router.post(
    "/upload",
    authMiddleware,
    upload.single("invoice"),
    async (req, res) => {

        let pending = null;
        let absoluteFilePath = null;
        let extractionSuccessful = false;

        try {

            // Check uploaded file.
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

            absoluteFilePath = path.resolve(req.file.path);

            if (!fs.existsSync(absoluteFilePath)) {
                return res.status(400).json({
                    message: "Uploaded file not found. Please upload again."
                });
            }

            // Check supported file types.
            const allowedMimeTypes = [
                "application/pdf",
                "image/jpeg",
                "image/png"
            ];

            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    message: "Only PDF, JPG and PNG files are supported."
                });
            }

            // Check file size (5 MB).
            if (req.file.size > 5 * 1024 * 1024) {
                return res.status(400).json({
                    message: "File size must be 5 MB or smaller."
                });
            }

            // Get FastAPI endpoint.
            const mlEndpoint = getMLServiceEndpoint();

            console.log("\n========== INVOICE UPLOAD ==========");
            console.log("File:", req.file.originalname);
            console.log("Size:", req.file.size);
            console.log("Type:", req.file.mimetype);
            console.log("ML Endpoint:", mlEndpoint);
            console.log("User ID:", userId);
            console.log("====================================\n");

            // Create multipart form data.
            const formData = new FormData();

            formData.append(
                "invoice",
                fs.createReadStream(absoluteFilePath),
                {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                }
            );

            // Send invoice to FastAPI.
            const mlResponse = await axios.post(
                mlEndpoint,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },

                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,

                    timeout: 180000,

                    validateStatus: status =>
                        status >= 200 && status < 300
                }
            );

            console.log("ML Service Status:", mlResponse.status);

            const extracted = mlResponse.data || {};

            // Validate ML response.
            if (
                typeof extracted !== "object" ||
                Array.isArray(extracted)
            ) {
                throw new Error(
                    "Invalid response received from ML service."
                );
            }

            // Prepare extracted invoice data.
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

            if (
                extractedInvoice.total !== null &&
                !Number.isFinite(extractedInvoice.total)
            ) {
                extractedInvoice.total = null;
            }

            // Combine extraction and backend validation errors.
            extractedInvoice.validationErrors = [
                ...new Set([
                    ...(Array.isArray(extracted.validationErrors)
                        ? extracted.validationErrors
                        : []),

                    ...getValidationErrors(extractedInvoice)
                ])
            ];

            console.log("\n========== EXTRACTED DATA ==========");
            console.log("Vendor:", extractedInvoice.vendor);
            console.log("Invoice Number:", extractedInvoice.invoiceNumber);
            console.log("Date:", extractedInvoice.date);
            console.log("Total:", extractedInvoice.total);
            console.log("Items:", extractedInvoice.items);
            console.log(
                "Predicted Category:",
                extractedInvoice.predictedCategory
            );
            console.log(
                "Validation Errors:",
                extractedInvoice.validationErrors
            );
            console.log("====================================\n");

            // Create pending invoice record.
            pending = await PendingInvoice.create({

                user: userId,

                ...extractedInvoice,

                fileName: req.file.originalname,

                filePath: absoluteFilePath

            });

            extractionSuccessful = true;

            // Send response to React frontend.
            return res.status(200).json({

                message: "Invoice extracted successfully. Review before saving.",

                pendingUploadId: pending._id,

                extractedInvoice

            });

        } catch (error) {

            console.error("\n========== INVOICE EXTRACTION ERROR ==========");

            console.error("Message:", error.message);

            console.error(
                "HTTP Status:",
                error.response?.status || "No response status"
            );

            console.error(
                "Response Data:",
                error.response?.data || "No response data"
            );

            console.error(
                "Request URL:",
                error.config?.url || "Unavailable"
            );

            console.error(
                "Response Headers:",
                error.response?.headers || "Unavailable"
            );

            console.error("===============================================\n");

            // Remove pending record if it was created.
            if (pending) {
                await PendingInvoice.deleteOne({
                    _id: pending._id,
                    user: getAuthenticatedUserId(req)
                }).catch(cleanupError => {
                    console.error(
                        "Pending cleanup error:",
                        cleanupError.message
                    );
                });
            }

            // Remove uploaded file after failed extraction.
            if (
                absoluteFilePath &&
                fs.existsSync(absoluteFilePath)
            ) {
                fs.unlink(absoluteFilePath, cleanupError => {
                    if (cleanupError) {
                        console.error(
                            "File cleanup error:",
                            cleanupError.message
                        );
                    }
                });
            }

            const upstreamStatus = error.response?.status;

            const statusCode = upstreamStatus === 429
                ? 503
                : error.response
                    ? 502
                    : error.code === "ECONNABORTED"
                        ? 504
                        : 500;

            let message = "Invoice extraction failed. Please try again.";

            if (upstreamStatus === 429) {
                message =
                    "The ML service returned a rate-limit response. Please wait before retrying.";
            } else if (upstreamStatus) {
                message =
                    error.response?.data?.detail ||
                    error.response?.data?.message ||
                    "The ML service could not process this invoice.";
            } else if (error.code === "ECONNABORTED") {
                message = "ML service request timed out.";
            } else if (error.code === "ECONNREFUSED") {
                message = "Unable to connect to the ML service.";
            } else if (error.message) {
                message = error.message;
            }

            return res.status(statusCode).json({

                message,

                upstreamStatus: upstreamStatus || null

            });

        } finally {

            // Do not delete a file required for confirmation.
            if (
                !extractionSuccessful &&
                absoluteFilePath &&
                fs.existsSync(absoluteFilePath)
            ) {
                // File cleanup is handled in the catch block.
            }

        }
    }
);

// ==================================================
// 6. STEP 2: CONFIRM AND SAVE INVOICE
// ==================================================

router.post(
    "/confirm",
    authMiddleware,
    async (req, res) => {

        try {

            const userId = getAuthenticatedUserId(req);

            if (!userId) {
                return res.status(401).json({
                    message: "Please log in again."
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

            // Find pending invoice belonging to this user.
            const pending = await PendingInvoice.findOne({
                _id: pendingUploadId,
                user: userId
            });

            if (!pending) {
                return res.status(404).json({
                    message: "Pending upload not found. Upload again."
                });
            }

            // Verify uploaded file.
            const uploadsDirectory = path.resolve(
                __dirname,
                "../uploads"
            );

            const storedFilePath = path.resolve(pending.filePath);

            if (
                !storedFilePath.startsWith(uploadsDirectory + path.sep) ||
                !fs.existsSync(storedFilePath)
            ) {
                return res.status(400).json({
                    message: "Uploaded file is unavailable. Please upload again."
                });
            }

            // Clean invoice fields.
            const cleanedVendor =
                typeof vendor === "string" ? vendor.trim() : "";

            const cleanedNumber =
                typeof invoiceNumber === "string"
                    ? invoiceNumber.trim()
                    : "";

            const cleanedDate =
                typeof date === "string" ? date.trim() : "";

            const numericTotal = Number(total);

            // Validate invoice details.
            if (
                !cleanedVendor ||
                !cleanedDate ||
                !Number.isFinite(numericTotal) ||
                numericTotal <= 0
            ) {
                return res.status(400).json({
                    message: "Enter a vendor, valid date and positive total."
                });
            }

            if (
                items != null &&
                (
                    !Array.isArray(items) ||
                    !items.every(item => typeof item === "string")
                )
            ) {
                return res.status(400).json({
                    message: "Invoice items must be a list of text values."
                });
            }

            const submittedItems = items ?? pending.items;

            if (
                !Array.isArray(submittedItems) ||
                !submittedItems.every(item => typeof item === "string")
            ) {
                return res.status(400).json({
                    message: "Invoice items must contain only text values."
                });
            }

            const cleanedItems = submittedItems
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

            const categoryStatus = category
                ? "User Confirmed"
                : cleanedCategory === "Uncategorized"
                    ? "Uncategorized"
                    : "AI Suggested";

            let savedInvoice;

            // Update existing invoice if invoice number matches.
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
                            categoryStatus,
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
                    categoryStatus,
                    status: "Processed",
                    fileName: pending.fileName,
                    filePath: storedFilePath

                });

            }

            // Delete pending record after successful save.
            await PendingInvoice.deleteOne({
                _id: pending._id,
                user: userId
            });

            console.log(
                "Invoice saved successfully:",
                savedInvoice._id
            );

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

// ==================================================
// 7. STEP 3: GET ALL USER INVOICES
// ==================================================

router.get("/", authMiddleware, async (req, res) => {

    try {

        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                message: "User identity is missing."
            });
        }

        const invoices = await Invoice.find({
            user: userId
        }).sort({
            createdAt: -1
        });

        return res.status(200).json({
            invoices
        });

    } catch (error) {

        console.error("Fetch invoices error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch invoices."
        });
    }
});

// ==================================================
// 8. STEP 4: EDIT INVOICE
// ==================================================

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

        const {
            vendor,
            invoiceNumber,
            date,
            total,
            items,
            category
        } = req.body;

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
            (
                !Array.isArray(items) ||
                !items.every(item => typeof item === "string")
            )
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

            {
                $set: updates
            },

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

// ==================================================
// 9. STEP 5: DELETE INVOICE
// ==================================================

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

// ==================================================
// 10. EXPORT ROUTER
// ==================================================

module.exports = router;
