
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    FileText,
    BrainCircuit,
    BarChart3,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";
import "./Register.css";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: formData.name.trim(),
                        email: formData.email.trim().toLowerCase(),
                        password: formData.password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed.");
            }

            setMessage("Account created successfully!");

            setFormData({
                name: "",
                email: "",
                password: "",
            });

            setShowPassword(false);

            setTimeout(() => {
                navigate("/login", {
                    replace: true,
                    state: {
                        message: "Account created successfully. Please sign in.",
                    },
                });
            }, 1200);
        } catch (err) {
            setError(err.message || "Unable to create your account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <section className="register-left">
                <div className="left-content">
                    <div className="brand">
                        <div className="brand-icon">
                            <FileText size={22} strokeWidth={2.4} />
                        </div>

                        <span className="brand-name">
                            Invoice<span>AI</span>
                        </span>
                    </div>

                    <div className="hero-eyebrow">
                        <span className="eyebrow-line" />
                        <span>AI-POWERED INVOICE INTELLIGENCE</span>
                    </div>

                    <h1 className="hero-title">
                        From Invoices
                        <br />
                        to <span>Insights</span>
                    </h1>

                    <p className="hero-description">
                        Let AI handle your invoices while you focus on what
                        matters.
                    </p>

                    <div className="feature-list">
                        <div className="feature-item">
                            <div className="feature-icon">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3>OCR Extraction</h3>
                                <p>Automatically extract invoice data</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon">
                                <BrainCircuit size={20} />
                            </div>
                            <div>
                                <h3>Expense Classification</h3>
                                <p>AI-powered expense categorization</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <h3>Analytics &amp; Reports</h3>
                                <p>Understand your spending instantly</p>
                            </div>
                        </div>

                        <div className="feature-item">
                            <div className="feature-icon">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3>Secure &amp; Scalable</h3>
                                <p>Built with modern security practices</p>
                            </div>
                        </div>
                    </div>

                    <div className="invoice-preview">
                        <div className="preview-header">
                            <div className="preview-file-icon">
                                <FileText size={17} />
                            </div>
                            <div>
                                <strong>Invoice</strong>
                                <span>#INV-1001</span>
                            </div>
                        </div>

                        <div className="preview-lines">
                            <span />
                            <span />
                            <span />
                        </div>

                        <div className="preview-total">
                            <span>Total</span>
                            <strong>₹69,030</strong>
                        </div>

                        <div className="ai-badge">
                            <BrainCircuit size={15} />
                            <span>AI</span>
                        </div>

                        <div className="category-badge">
                            <span>Category</span>
                            <strong>IT</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="register-right">
                <div className="register-card">
                    <div className="form-header">
                        <div className="form-eyebrow">GET STARTED</div>
                        <h2>Create your account</h2>
                        <p>Join thousands simplifying their invoice workflow.</p>
                    </div>

                    <form
                        className="register-form"
                        onSubmit={handleSubmit}
                        autoComplete="off"
                    >
                        <div className="form-group">
                            <label htmlFor="register-name">Full Name</label>

                            <div className="input-wrapper">
                                <User
                                    className="input-icon"
                                    size={20}
                                    aria-hidden="true"
                                />

                                <input
                                    id="register-name"
                                    type="text"
                                    name="name"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    autoCapitalize="words"
                                    maxLength={100}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-email">
                                Email Address
                            </label>

                            <div className="input-wrapper">
                                <Mail
                                    className="input-icon"
                                    size={20}
                                    aria-hidden="true"
                                />

                                <input
                                    id="register-email"
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-password">
                                Password
                            </label>

                            <div className="input-wrapper">
                                <Lock
                                    className="input-icon"
                                    size={20}
                                    aria-hidden="true"
                                />

                                <input
                                    id="register-password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword((previous) => !previous)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="error-message" role="alert">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="success-message" role="status">
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="register-button"
                            disabled={loading}
                        >
                            <span>
                                {loading ? "Creating account..." : "Create Account"}
                            </span>

                            {!loading && <ArrowRight size={20} />}
                        </button>
                    </form>

                    <div className="divider">
                        <span />
                        <p>or continue with</p>
                        <span />
                    </div>

                    <div className="social-buttons">
                        <button
                            type="button"
                            className="social-button"
                            onClick={() =>
                                setError("Google sign-in is not configured yet.")
                            }
                        >
                            <strong className="google-icon">G</strong>
                            <span>Google</span>
                        </button>

                        <button
                            type="button"
                            className="social-button"
                            onClick={() =>
                                setError("GitHub sign-in is not configured yet.")
                            }
                        >
                            <strong className="github-icon">&lt;/&gt;</strong>
                            <span>GitHub</span>
                        </button>
                    </div>

                    <div className="login-link">
                        <span>Already have an account?</span>
                        <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Register;
