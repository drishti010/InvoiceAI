
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${crypto.randomUUID()}${extension}`);
    }
});

const allowedTypes = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (!allowedTypes.has(extension)) {
            return callback(
                new Error("Only PDF, JPG, and PNG files are allowed.")
            );
        }

        callback(null, true);
    }
});

module.exports = upload;
