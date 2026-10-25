
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                }
            );

            const data = await response.json();
            console.log("Login API status:", response.status);
            console.log("Login API response:", {
                message: data.message,
                hasToken: Boolean(data.token),
                hasUser: Boolean(data.user)
            });

            if (!response.ok) {
                setError(data.message || "Login failed");
                return;
            }
            if (!data.token) {
                setError("Login succeeded, but the server did not return a token.");
                return;
            }

            localStorage.setItem("token", data.token);

            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }

            navigate("/dashboard", { replace: true });
                        
            
        } catch (err) {
            console.error("Login error:", err);
            setError("Unable to connect to server. Check that the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="login-page">
        <div className="login-glow login-glow-one"></div>
        <div className="login-glow login-glow-two"></div>

        <div className="login-card">
            <div className="login-brand">
                <div className="login-brand-icon">I</div>
                <div className="login-brand-name">
                    Invoice<span>AI</span>
                </div>
            </div>

            <div className="login-eyebrow">
                YOUR FINANCIAL WORKSPACE
            </div>

            <h1 className="login-title">Welcome back</h1>

            <p className="login-subtitle">
                Sign in to manage your invoices and expense insights.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="login-field">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                                    
                
                <div className="login-forgot-password">
                    <Link to="/forgot-password">Forgot password?</Link>
                </div>



                {error && (
                    <p className="login-error">{error}</p>
                )}

                <button
                    className="login-button"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>
            </form>

            <p className="login-footer">
                Don't have an account?
                <Link to="/register">Create account</Link>
            </p>

            <div className="login-security">
                Secure access to your invoice workspace
            </div>
        </div>
    </div>
);
}

export default Login;
