
import { useState } from "react";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message ||
                    "Unable to send the reset email. Please try again."
                );
                return;
            }

            setMessage(
                data.message ||
                "If an account exists with this email, a password reset link will be sent."
            );
        } catch (err) {
            console.error("Forgot password error:", err);
            setError(
                "Unable to connect to the server. Please check that the backend is running."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-page">
            <div className="forgot-glow forgot-glow-one"></div>
            <div className="forgot-glow forgot-glow-two"></div>

            <div className="forgot-card">
                <div className="forgot-brand">
                    Invoice<span>AI</span>
                </div>

                <div className="forgot-icon">🔐</div>

                <h1>Forgot your password?</h1>

                <p className="forgot-subtitle">
                    Enter your registered email address and we'll send
                    you a secure password reset link.
                </p>

                <form onSubmit={handleSubmit} className="forgot-form">
                    <div className="forgot-field">
                        <label htmlFor="forgot-email">
                            Email address
                        </label>

                        <input
                            id="forgot-email"
                            type="email"
                            placeholder="Enter your registered email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    {message && (
                        <p className="forgot-success" role="status">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="forgot-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="forgot-button"
                        disabled={loading}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <p className="forgot-footer">
                    Remember your password?{" "}
                    <Link to="/login">Back to Login</Link>
                </p>

                <div className="forgot-security">
                    Your account security matters to us.
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
