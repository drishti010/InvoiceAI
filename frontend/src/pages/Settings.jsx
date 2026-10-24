
import { useEffect, useState } from "react";
import {
    UserRound,
    Palette,
    Bell,
    ShieldCheck,
    Save,
    ArrowLeft,
    LockKeyhole,
    LogOut,
    Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Settings.css";

const API_URL = "http://localhost:5000/api/auth";

function Settings({ theme, toggleTheme }) {
    const navigate = useNavigate();

    const [profileName, setProfileName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");

    const [notifications, setNotifications] = useState(
        () =>
            localStorage.getItem("invoiceai-settings-notifications") !==
            "false"
    );

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [deletePassword, setDeletePassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                navigate("/login", { replace: true });
                return;
            }

            try {
                const response = await fetch(`${API_URL}/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/login", { replace: true });
                        return;
                    }

                    throw new Error(
                        data.message || "Unable to load profile."
                    );
                }

                setProfileName(data.user.name || "");
                setEmail(data.user.email || "");
                setMobile(data.user.mobile || "");
            } catch (err) {
                setError(err.message || "Unable to load profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token, navigate]);

    const handleProfileSave = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        setSavingProfile(true);

        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: profileName,
                    email,
                    mobile,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update profile."
                );
            }

            setProfileName(data.user.name || "");
            setEmail(data.user.email || "");
            setMobile(data.user.mobile || "");

            const storedUser = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...storedUser,
                    id: data.user._id || storedUser.id,
                    name: data.user.name,
                    email: data.user.email,
                    mobile: data.user.mobile || "",
                })
            );

            setMessage("Profile updated successfully.");
        } catch (err) {
            setError(err.message || "Unable to update profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        if (newPassword.length < 8) {
            setError(
                "New password must contain at least 8 characters."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        setChangingPassword(true);

        try {
            const response = await fetch(
                `${API_URL}/change-password`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to change password."
                );
            }

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            navigate("/login", {
                replace: true,
                state: {
                    message:
                        "Password changed successfully. Please log in again.",
                },
            });
        } catch (err) {
            setError(err.message || "Unable to change password.");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
    };

    const handleDeleteAccount = async () => {
        setMessage("");
        setError("");

        if (!deletePassword) {
            setError(
                "Enter your current password before deleting your account."
            );
            return;
        }

        const confirmed = window.confirm(
            "Permanently delete your InvoiceAI account, invoices, and pending invoices? This action cannot be undone."
        );

        if (!confirmed) return;

        setDeletingAccount(true);

        try {
            const response = await fetch(`${API_URL}/account`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: deletePassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to delete account."
                );
            }

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem(
                "invoiceai-settings-notifications"
            );

            navigate("/login", {
                replace: true,
                state: {
                    message:
                        data.message ||
                        "Your account has been deleted successfully.",
                },
            });
        } catch (err) {
            setError(err.message || "Unable to delete account.");
        } finally {
            setDeletingAccount(false);
        }
    };

    if (loading) {
        return (
            <div className={`settings-page ${theme}-theme`}>
                <main className="settings-content">
                    <p>Loading your account settings...</p>
                </main>
            </div>
        );
    }

    return (
        <div className={`settings-page ${theme}-theme`}>
            <header className="settings-topbar">
                <Link to="/dashboard" className="settings-back">
                    <ArrowLeft size={18} />
                    Dashboard
                </Link>

                <button
                    type="button"
                    className="settings-theme-button"
                    onClick={toggleTheme}
                >
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
            </header>

            <main className="settings-content">
                <section className="settings-intro">
                    <span className="settings-eyebrow">
                        WORKSPACE PREFERENCES
                    </span>
                    <h1>Settings</h1>
                    <p>
                        Manage your profile, security, appearance, and
                        notification preferences.
                    </p>
                </section>

                {error && (
                    <p className="settings-error" role="alert">
                        {error}
                    </p>
                )}

                {message && (
                    <p className="settings-success" role="status">
                        {message}
                    </p>
                )}

                <form
                    onSubmit={handleProfileSave}
                    className="settings-form"
                >
                    <section className="settings-card">
                        <div className="settings-card-heading">
                            <span className="settings-icon">
                                <UserRound size={20} />
                            </span>
                            <div>
                                <h2>Profile information</h2>
                                <p>
                                    Update your account details saved in
                                    MongoDB.
                                </p>
                            </div>
                        </div>

                        <label className="settings-field">
                            <span>Full name</span>
                            <input
                                value={profileName}
                                onChange={(event) =>
                                    setProfileName(event.target.value)
                                }
                                required
                                maxLength={100}
                                placeholder="Enter your name"
                            />
                        </label>

                        <label className="settings-field">
                            <span>Email address</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                required
                                placeholder="Enter your email"
                            />
                        </label>

                        <label className="settings-field">
                            <span>Mobile number</span>
                            <input
                                type="tel"
                                value={mobile}
                                onChange={(event) =>
                                    setMobile(event.target.value)
                                }
                                placeholder="Enter your mobile number"
                                maxLength={20}
                            />
                        </label>

                        <div className="settings-save-area">
                            <button
                                type="submit"
                                className="settings-save-button"
                                disabled={savingProfile}
                            >
                                <Save size={17} />
                                {savingProfile
                                    ? "Saving..."
                                    : "Save profile"}
                            </button>
                        </div>
                    </section>
                </form>

                <section className="settings-card">
                    <div className="settings-card-heading">
                        <span className="settings-icon">
                            <LockKeyhole size={20} />
                        </span>
                        <div>
                            <h2>Change password</h2>
                            <p>
                                Verify your current password before
                                choosing a new one.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordChange}>
                        <label className="settings-field">
                            <span>Current password</span>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(event) =>
                                    setCurrentPassword(event.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />
                        </label>

                        <label className="settings-field">
                            <span>New password</span>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(event) =>
                                    setNewPassword(event.target.value)
                                }
                                minLength={8}
                                autoComplete="new-password"
                                required
                            />
                        </label>

                        <label className="settings-field">
                            <span>Confirm new password</span>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                minLength={8}
                                autoComplete="new-password"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="settings-save-button"
                            disabled={changingPassword}
                        >
                            <LockKeyhole size={17} />
                            {changingPassword
                                ? "Updating..."
                                : "Update password"}
                        </button>
                    </form>
                </section>

                <section className="settings-card">
                    <div className="settings-card-heading">
                        <span className="settings-icon">
                            <Palette size={20} />
                        </span>
                        <div>
                            <h2>Appearance</h2>
                            <p>Choose the look of your workspace.</p>
                        </div>
                    </div>

                    <div className="settings-preference-row">
                        <div>
                            <strong>Workspace theme</strong>
                            <p>
                                Current theme:{" "}
                                {theme === "dark" ? "Dark" : "Light"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="settings-secondary-button"
                            onClick={toggleTheme}
                        >
                            Switch theme
                        </button>
                    </div>
                </section>

                <section className="settings-card">
                    <div className="settings-card-heading">
                        <span className="settings-icon">
                            <Bell size={20} />
                        </span>
                        <div>
                            <h2>Notifications</h2>
                            <p>Manage your notification preference.</p>
                        </div>
                    </div>

                    <label className="settings-preference-row settings-toggle-row">
                        <div>
                            <strong>Invoice notifications</strong>
                            <p>
                                Save your preference in this browser.
                            </p>
                        </div>

                        <input
                            type="checkbox"
                            checked={notifications}
                            onChange={(event) => {
                                const value = event.target.checked;
                                setNotifications(value);
                                localStorage.setItem(
                                    "invoiceai-settings-notifications",
                                    String(value)
                                );
                            }}
                        />
                    </label>
                </section>

                <section className="settings-card">
                    <div className="settings-card-heading">
                        <span className="settings-icon">
                            <ShieldCheck size={20} />
                        </span>
                        <div>
                            <h2>Account and security</h2>
                            <p>
                                Manage your current InvoiceAI login
                                session.
                            </p>
                        </div>
                    </div>

                    <div className="settings-account-actions">
                        <button
                            type="button"
                            className="settings-secondary-button"
                            onClick={handleLogout}
                        >
                            <LogOut size={17} />
                            Log out
                        </button>
                    </div>

                    <label className="settings-field">
                        <span>
                            Current password (required to delete account)
                        </span>
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(event) =>
                                setDeletePassword(event.target.value)
                            }
                            autoComplete="current-password"
                            placeholder="Enter your current password"
                        />
                    </label>

                    <div className="settings-account-actions">
                        <button
                            type="button"
                            className="settings-danger-button"
                            onClick={handleDeleteAccount}
                            disabled={deletingAccount}
                        >
                            <Trash2 size={17} />
                            {deletingAccount
                                ? "Deleting account..."
                                : "Delete account"}
                        </button>
                    </div>
                </section>

                <footer className="settings-footer">
                    © 2026 InvoiceAI · Intelligent invoicing, simplified.
                </footer>
            </main>
        </div>
    );
}

export default Settings;
