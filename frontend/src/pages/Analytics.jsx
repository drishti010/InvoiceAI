
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    ChartNoAxesCombined,
    Receipt,
    Wallet,
    PieChart,
    TrendingUp,
    Sun,
    Moon,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./Analytics.css";

const API_URL = "http://localhost:5000/api/invoices";

const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);

function Analytics({ theme = "dark", toggleTheme }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error(
                        "Please log in to view analytics."
                    );
                }

                const response = await fetch(API_URL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                            "Unable to load invoice data."
                    );
                }

                const invoiceList = Array.isArray(data)
                    ? data
                    : Array.isArray(data.invoices)
                      ? data.invoices
                      : [];

                setInvoices(invoiceList);
            } catch (err) {
                setError(
                    err.message || "Unable to load analytics."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    const totalExpenses = invoices.reduce(
        (sum, invoice) =>
            sum + (Number(invoice.total) || 0),
        0
    );

    const categoryTotals = invoices.reduce(
        (totals, invoice) => {
            const category =
                invoice.category ||
                invoice.predictedCategory ||
                "Uncategorized";

            totals[category] =
                (totals[category] || 0) +
                (Number(invoice.total) || 0);

            return totals;
        },
        {}
    );

    const categories = Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1]
    );

    const colors = [
        "#4b91ff",
        "#8960f5",
        "#36c6d5",
        "#ef73bb",
        "#f6a64b",
    ];

    const maxCategoryAmount = Math.max(
        ...categories.map(([, amount]) => amount),
        1
    );

    return (
        <main
            className={`analytics-page ${
                theme === "light" ? "light-theme" : "dark-theme"
            }`}
        >
            <header className="analytics-header">
                <div className="analytics-topbar">
                    <Link
                        to="/dashboard"
                        className="analytics-back"
                    >
                        <ArrowLeft size={18} />
                        Dashboard
                    </Link>

                    {typeof toggleTheme === "function" && (
                        <button
                            type="button"
                            className="analytics-theme-toggle"
                            onClick={toggleTheme}
                            aria-label={
                                theme === "dark"
                                    ? "Switch to light theme"
                                    : "Switch to dark theme"
                            }
                            title={
                                theme === "dark"
                                    ? "Switch to light theme"
                                    : "Switch to dark theme"
                            }
                        >
                            {theme === "dark" ? (
                                <Sun size={19} />
                            ) : (
                                <Moon size={19} />
                            )}

                            <span>
                                {theme === "dark"
                                    ? "Light mode"
                                    : "Dark mode"}
                            </span>
                        </button>
                    )}
                </div>

                <div className="analytics-eyebrow">
                    YOUR FINANCIAL WORKSPACE
                </div>

                <h1>
                    <ChartNoAxesCombined size={32} />
                    Expense Analytics
                </h1>

                <p>
                    Understand how your recorded expenses are
                    distributed.
                </p>
            </header>

            {loading ? (
                <div className="analytics-message">
                    Loading your analytics...
                </div>
            ) : error ? (
                <div className="analytics-message analytics-error">
                    {error}
                </div>
            ) : (
                <>
                    <section className="analytics-stats">
                        <article className="analytics-card">
                            <Receipt size={23} />
                            <span>Total invoices</span>
                            <strong>{invoices.length}</strong>
                        </article>

                        <article className="analytics-card">
                            <Wallet size={23} />
                            <span>Total recorded expenses</span>
                            <strong>{money(totalExpenses)}</strong>
                        </article>

                        <article className="analytics-card">
                            <PieChart size={23} />
                            <span>Expense categories</span>
                            <strong>{categories.length}</strong>
                        </article>
                    </section>

                    <section className="analytics-panel">
                        <div className="analytics-panel-heading">
                            <div>
                                <h2>
                                    <TrendingUp size={21} />
                                    Spending by category
                                </h2>

                                <p>
                                    Based on invoices currently saved
                                    in your database.
                                </p>
                            </div>
                        </div>

                        {categories.length === 0 ? (
                            <p className="analytics-message">
                                No invoice data is available yet.
                                Upload an invoice to get started.
                            </p>
                        ) : (
                            <div className="analytics-category-list">
                                {categories.map(
                                    ([name, amount], index) => (
                                        <div
                                            className="analytics-category"
                                            key={name}
                                        >
                                            <div className="analytics-category-info">
                                                <span
                                                    className="analytics-category-dot"
                                                    style={{
                                                        background:
                                                            colors[
                                                                index %
                                                                    colors.length
                                                            ],
                                                    }}
                                                />

                                                <span>{name}</span>

                                                <strong>
                                                    {money(amount)}
                                                </strong>
                                            </div>

                                            <div className="analytics-progress-track">
                                                <div
                                                    className="analytics-progress-fill"
                                                    style={{
                                                        width: `${
                                                            (amount /
                                                                maxCategoryAmount) *
                                                            100
                                                        }%`,
                                                        background:
                                                            colors[
                                                                index %
                                                                    colors.length
                                                            ],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

export default Analytics;
