
const Invoice = require("../models/Invoice");
const PendingInvoice = require("../models/PendingInvoice");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PasswordResetToken = require("../models/PasswordResetToken");

// EMAIL TRANSPORTER
const emailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, "")
    }
});

// REGISTER USER
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Please provide name, email and password"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Please provide email and password"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// GET CURRENT USER PROFILE
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select(
            "-password"
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error("Get profile error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
    try {
        const { name, email, mobile } = req.body;

        if (
            name === undefined &&
            email === undefined &&
            mobile === undefined
        ) {
            return res.status(400).json({
                message: "Provide at least one profile field to update"
            });
        }

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "Name cannot be empty"
                });
            }

            updates.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== "string" || !email.trim()) {
                return res.status(400).json({
                    message: "Email cannot be empty"
                });
            }

            const normalizedEmail = email.trim().toLowerCase();

            const existingUser = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: req.user.userId }
            });

            if (existingUser) {
                return res.status(409).json({
                    message: "That email is already in use"
                });
            }

            updates.email = normalizedEmail;
        }

        if (mobile !== undefined) {
            if (
                typeof mobile !== "string" ||
                (
                    mobile.trim() !== "" &&
                    !/^\+?[0-9\s()-]{7,20}$/.test(mobile.trim())
                )
            ) {
                return res.status(400).json({
                    message: "Please provide a valid mobile number"
                });
            }

            updates.mobile = mobile.trim();
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user
        });
    } catch (error) {
        console.error("Update profile error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "That email is already in use"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                message: "Please provide your current and new password"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must contain at least 8 characters"
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            return res.status(400).json({
                message: "New password must be different from current password"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Invalidate outstanding reset links after a password change.
        await PasswordResetToken.deleteMany({ user: user._id });

        return res.status(200).json({
            message: "Password changed successfully. Please log in again."
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// DELETE ACCOUNT
const deleteAccount = async (req, res) => {
    let session;
    let filePaths = [];

    try {
        const { currentPassword } = req.body;
        const userId = req.user.userId;

        if (
            typeof currentPassword !== "string" ||
            !currentPassword
        ) {
            return res.status(400).json({
                message: "Current password is required"
            });
        }

        session = await User.startSession();

        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);

            if (!user) {
                const error = new Error("User not found");
                error.code = "USER_NOT_FOUND";
                throw error;
            }

            const isPasswordCorrect = await bcrypt.compare(
                currentPassword,
                user.password
            );

            if (!isPasswordCorrect) {
                const error = new Error("Incorrect current password");
                error.code = "INVALID_PASSWORD";
                throw error;
            }

            const invoices = await Invoice.find({ user: userId })
                .select("filePath")
                .session(session);

            const pendingInvoices = await PendingInvoice.find({
                user: userId
            })
                .select("filePath")
                .session(session);

            filePaths = [
                ...invoices.map(invoice => invoice.filePath),
                ...pendingInvoices.map(invoice => invoice.filePath)
            ];

            await Invoice.deleteMany({ user: userId }, { session });

            await PendingInvoice.deleteMany(
                { user: userId },
                { session }
            );

            await PasswordResetToken.deleteMany(
                { user: userId },
                { session }
            );

            await User.deleteOne({ _id: userId }, { session });
        });

        // Delete files only inside backend/uploads.
        const uploadsDir = path.resolve(__dirname, "../uploads");

        for (const filePath of filePaths) {
            if (typeof filePath !== "string" || !filePath) continue;

            const absolutePath = path.resolve(filePath);

            if (
                absolutePath.startsWith(uploadsDir + path.sep) &&
                path.dirname(absolutePath) === uploadsDir
            ) {
                try {
                    await fs.promises.unlink(absolutePath);
                } catch (error) {
                    if (error.code !== "ENOENT") {
                        console.error(
                            "Could not delete uploaded file:",
                            error.message
                        );
                    }
                }
            }
        }

        return res.status(200).json({
            message: "Account and associated data deleted successfully"
        });
    } catch (error) {
        if (error.code === "INVALID_PASSWORD") {
            return res.status(401).json({
                message: "Incorrect current password"
            });
        }

        if (error.code === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "User not found"
            });
        }

        console.error("Delete account error:", error.message);

        return res.status(500).json({
            message: "Failed to delete account"
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        if (!email) {
            return res.status(400).json({
                message: "Please enter your email address."
            });
        }

        const successMessage =
            "If an account exists with this email, a password reset link will be sent.";

        const user = await User.findOne({ email });

        // Avoid revealing whether an account exists.
        if (!user) {
            return res.status(200).json({
                message: successMessage
            });
        }

        if (
            !process.env.EMAIL_USER ||
            !process.env.EMAIL_APP_PASSWORD
        ) {
            throw new Error("Email configuration is missing");
        }

        // Invalidate older reset links for this user.
        await PasswordResetToken.deleteMany({ user: user._id });

        // Generate a secure random token; store only its hash.
        const resetToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        await PasswordResetToken.create({
            user: user._id,
            tokenHash,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        const frontendUrl = (
            process.env.FRONTEND_URL || "http://localhost:5173"
        ).replace(/\/+$/, "");

        const resetLink =
            `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

        try {
            await emailTransporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Reset your InvoiceAI password",
                text:
                    "We received a request to reset your InvoiceAI password.\n\n" +
                    `Open this link within 15 minutes:\n${resetLink}\n\n` +
                    "If you did not request this, you can ignore this email.",
                html: `
                    <div style="font-family:Arial,sans-serif;line-height:1.6">
                        <h2>InvoiceAI Password Reset</h2>
                        <p>We received a request to reset your password.</p>
                        <p>This link expires in <strong>15 minutes</strong>.</p>
                        <p>
                            <a href="${resetLink}"
                               style="background:#4f46e5;color:white;
                               padding:12px 18px;text-decoration:none;
                               border-radius:8px;display:inline-block">
                                Reset Password
                            </a>
                        </p>
                        <p>If you did not request this, ignore this email.</p>
                    </div>
                `
            });
        } catch (emailError) {
            await PasswordResetToken.deleteMany({ user: user._id });
            throw emailError;
        }

        return res.status(200).json({
            message: successMessage
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            message: "Unable to process the reset request right now. Please try again later."
        });
    }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (
            typeof token !== "string" ||
            !token ||
            typeof newPassword !== "string" ||
            !newPassword
        ) {
            return res.status(400).json({
                message: "Token and new password are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long."
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Atomically consume an unexpired token once.
        const resetRecord = await PasswordResetToken.findOneAndDelete({
            tokenHash,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            return res.status(400).json({
                message: "This reset link is invalid or has expired."
            });
        }

        const user = await User.findById(resetRecord.user);

        if (!user) {
            return res.status(400).json({
                message: "This reset link is invalid or has expired."
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Invalidate any other outstanding reset links.
        await PasswordResetToken.deleteMany({ user: user._id });

        return res.status(200).json({
            message: "Password reset successful. Please log in with your new password."
        });
    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            message: "Unable to reset your password right now. Please try again later."
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    forgotPassword,
    resetPassword
};
