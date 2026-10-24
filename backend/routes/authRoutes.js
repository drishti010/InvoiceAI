
const express = require("express");

const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    forgotPassword,
    resetPassword
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/change-password", authMiddleware, changePassword);
router.delete("/account", authMiddleware, deleteAccount);

module.exports = router;
