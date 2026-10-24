
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./ResetPassword.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reset your password."
        );
      }

      setMessage(
        data.message || "Password reset successful. You can now log in."
      );

      setPassword("");
      setConfirmPassword("");

      // Remove the reset token from the browser address.
      window.history.replaceState({}, "", "/reset-password");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page">
      <section className="reset-card">
        <div className="reset-logo">InvoiceAI</div>

        <div className="reset-icon">🔐</div>

        <h1>Reset your password</h1>

        <p className="reset-description">
          Create a new password for your InvoiceAI account.
        </p>

        {!message && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Enter your password again"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              required
              minLength={8}
            />

            {error && <p className="reset-error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Resetting password..." : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <div className="reset-success">
            <p>{message}</p>
            <button onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </div>
        )}

        {!message && (
          <p className="reset-footer">
            Remembered your password? <Link to="/login">Back to Login</Link>
          </p>
        )}
      </section>
    </main>
  );
}

export default ResetPassword;
