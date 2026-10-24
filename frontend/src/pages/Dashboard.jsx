import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FileText,
    LayoutDashboard,
    Upload,
    Receipt,
    ChartNoAxesCombined,
    Settings,
    Search,
    Bell,
    Plus,
    Wallet,
    CircleCheck,
    Clock3,
    TrendingUp,
    ArrowUpRight,
    Download,
    MoreHorizontal,
    ChevronDown,
    Sun,
    Moon,
    Sparkles,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api/invoices";

const CATEGORY_COLORS = [
    "#4b91ff",
    "#8960f5",
    "#36c6d5",
    "#ef73bb",
    "#f59e0b",
    "#22c55e",
    "#a78bfa",
];

const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

function parseInvoiceDate(value) {
    if (!value) return null;

    const text = String(value).trim();
    const numericDate = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);

    if (numericDate) {
        const [, day, month, year] = numericDate;

        const parsed = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );

        if (
            parsed.getFullYear() === Number(year) &&
            parsed.getMonth() === Number(month) - 1 &&
            parsed.getDate() === Number(day)
        ) {
            return parsed;
        }

        return null;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
    const parsed = parseInvoiceDate(value);

    return parsed
        ? parsed.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : value || "—";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function Dashboard({ theme, toggleTheme }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [search, setSearch] = useState("");
    const [period, setPeriod] = useState("Last 6 months");
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                setInvoices([]);
                setError("Please log in to view your dashboard.");
                return;
            }

            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.status === 401) {
                setInvoices([]);
                setError("Your session has expired. Please log in again.");
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load dashboard data."
                );
            }

            setInvoices(
                Array.isArray(data.invoices) ? data.invoices : []
            );
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setInvoices([]);
            setError(err.message || "Unable to connect to the backend.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = useMemo(() => {
        const query = search.trim().toLowerCase();

        return invoices.filter((invoice) =>
            [
                invoice.invoiceNumber,
                invoice.vendor,
                invoice.category,
                invoice.fileName,
                invoice.status,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            )
        );
    }, [invoices, search]);

    const totalExpenses = invoices.reduce(
        (sum, invoice) => sum + (Number(invoice.total) || 0),
        0
    );

    const processedCount = invoices.filter(
        (invoice) => invoice.status === "Processed"
    ).length;

    const pendingCount = invoices.filter((invoice) =>
        ["Uploaded", "Processing", "Needs Review"].includes(invoice.status)
    ).length;

    const processedPercentage = invoices.length
        ? Math.round((processedCount / invoices.length) * 100)
        : 0;

    const monthCount =
        period === "Last 3 months"
            ? 3
            : period === "Last 12 months"
              ? 12
              : 6;

    const monthlyExpenses = useMemo(() => {
        const now = new Date();

        const months = Array.from({ length: monthCount }, (_, index) => {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - monthCount + 1 + index,
                1
            );

            return {
                key: `${date.getFullYear()}-${date.getMonth()}`,
                month: date.toLocaleDateString("en-US", {
                    month: "short",
                }),
                amount: 0,
            };
        });

        const monthLookup = new Map(
            months.map((month) => [month.key, month])
        );

        invoices.forEach((invoice) => {
            const date = parseInvoiceDate(invoice.date);
            if (!date) return;

            const key = `${date.getFullYear()}-${date.getMonth()}`;
            const month = monthLookup.get(key);

            if (month) {
                month.amount += Number(invoice.total) || 0;
            }
        });

        return months;
    }, [invoices, monthCount]);

    const chartTotal = monthlyExpenses.reduce(
        (sum, month) => sum + month.amount,
        0
    );

    const maxMonthlyAmount = Math.max(
        1,
        ...monthlyExpenses.map((month) => month.amount)
    );

    const categories = useMemo(() => {
        const totals = new Map();

        invoices.forEach((invoice) => {
            const name =
                String(invoice.category || "Uncategorized").trim() ||
                "Uncategorized";

            totals.set(
                name,
                (totals.get(name) || 0) + (Number(invoice.total) || 0)
            );
        });

        return [...totals.entries()]
            .map(([name, amount], index) => ({
                name,
                amount,
                color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [invoices]);

    const categoryGradient = useMemo(() => {
        if (!categories.length || totalExpenses <= 0) {
            return "conic-gradient(#26344c 0% 100%)";
        }

        let currentPercentage = 0;

        const segments = categories.map((category) => {
            const start = currentPercentage;
            currentPercentage += (category.amount / totalExpenses) * 100;

            return `${category.color} ${start}% ${currentPercentage}%`;
        });

        return `conic-gradient(${segments.join(", ")})`;
    }, [categories, totalExpenses]);

    const recentInvoices = useMemo(
        () =>
            [...filteredInvoices]
                .sort((a, b) => {
                    const dateA = parseInvoiceDate(a.date)?.getTime() || 0;
                    const dateB = parseInvoiceDate(b.date)?.getTime() || 0;
                    return dateB - dateA;
                })
                .slice(0, 5),
        [filteredInvoices]
    );

    // Export the most recent invoice displayed in Recent invoices.
    const handleExportInvoice = () => {
        if (recentInvoices.length === 0) return;

        const invoice = recentInvoices[0];
        const items = Array.isArray(invoice.items) ? invoice.items : [];

        const invoiceHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Invoice - ${escapeHtml(
                    invoice.invoiceNumber || invoice.fileName || "Invoice"
                )}</title>
                <style>
                    * { box-sizing: border-box; }

                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #172033;
                        background: #fff;
                        margin: 0;
                        padding: 40px;
                    }

                    .invoice {
                        max-width: 760px;
                        margin: 0 auto;
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        padding-bottom: 24px;
                        border-bottom: 2px solid #4b65f6;
                    }

                    .brand {
                        font-size: 25px;
                        font-weight: 800;
                        color: #172033;
                    }

                    .brand span { color: #6558f5; }

                    .label {
                        color: #697386;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }

                    h1 {
                        font-size: 28px;
                        margin: 28px 0 8px;
                    }

                    .number {
                        color: #697386;
                        margin-bottom: 28px;
                        overflow-wrap: anywhere;
                    }

                    .details {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 18px;
                        margin: 25px 0;
                    }

                    .detail {
                        padding: 15px;
                        border: 1px solid #e1e6ef;
                        border-radius: 8px;
                        overflow-wrap: anywhere;
                    }

                    .value {
                        display: block;
                        margin-top: 8px;
                        font-weight: 700;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 25px;
                    }

                    th, td {
                        padding: 13px 10px;
                        text-align: left;
                        border-bottom: 1px solid #e1e6ef;
                    }

                    th {
                        background: #f5f7fb;
                        font-size: 11px;
                        text-transform: uppercase;
                    }

                    .total {
                        margin-top: 25px;
                        margin-left: auto;
                        max-width: 300px;
                        padding: 20px;
                        background: #f5f7ff;
                        border-radius: 8px;
                    }

                    .total strong {
                        display: block;
                        margin-top: 8px;
                        font-size: 24px;
                    }

                    .footer {
                        margin-top: 45px;
                        padding-top: 15px;
                        border-top: 1px solid #e1e6ef;
                        color: #697386;
                        font-size: 12px;
                        text-align: center;
                    }

                    @media print {
                        body { padding: 0; }
                        .invoice { max-width: none; }
                        .detail, .total { break-inside: avoid; }
                    }

                    @media (max-width: 540px) {
                        body { padding: 18px; }
                        .details { grid-template-columns: 1fr; }
                    }
                </style>
            </head>
            <body>
                <main class="invoice">
                    <header class="header">
                        <div class="brand">Invoice<span>AI</span></div>
                        <div style="text-align:right">
                            <div class="label">Invoice record status</div>
                            <div style="margin-top:8px;font-weight:700">
                                ${escapeHtml(invoice.status || "Uploaded")}
                            </div>
                        </div>
                    </header>

                    <h1>Invoice details</h1>

                    <div class="number">
                        ${escapeHtml(
                            invoice.invoiceNumber || "Invoice number unavailable"
                        )}
                    </div>

                    <section class="details">
                        <div class="detail">
                            <span class="label">Vendor</span>
                            <span class="value">${escapeHtml(
                                invoice.vendor || "Unknown"
                            )}</span>
                        </div>

                        <div class="detail">
                            <span class="label">Invoice date</span>
                            <span class="value">${escapeHtml(
                                formatDate(invoice.date)
                            )}</span>
                        </div>

                        <div class="detail">
                            <span class="label">Category</span>
                            <span class="value">${escapeHtml(
                                invoice.category || "Uncategorized"
                            )}</span>
                        </div>

                        <div class="detail">
                            <span class="label">Uploaded file</span>
                            <span class="value">${escapeHtml(
                                invoice.fileName || "Not available"
                            )}</span>
                        </div>
                    </section>

                    ${
                        items.length
                            ? `
                                <table>
                                    <thead>
                                        <tr><th>Extracted item</th></tr>
                                    </thead>
                                    <tbody>
                                        ${items
                                            .map(
                                                (item) =>
                                                    `<tr><td>${escapeHtml(
                                                        item
                                                    )}</td></tr>`
                                            )
                                            .join("")}
                                    </tbody>
                                </table>
                            `
                            : ""
                    }

                    <section class="total">
                        <span class="label">Total amount</span>
                        <strong>${escapeHtml(money(invoice.total))}</strong>
                    </section>

                    <footer class="footer">
                        Generated from InvoiceAI
                    </footer>
                </main>
            </body>
            </html>
        `;

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert(
                "The export window was blocked. Please allow pop-ups for localhost and try again."
            );
            return;
        }

        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    return (
        <div className={`inv-dashboard ${theme || "dark"}-theme`}>
            <aside className="inv-sidebar">
                <Link to="/dashboard" className="dashboard-brand">
                    <span className="dashboard-brand-icon">
                        <FileText size={25} />
                    </span>
                    <span>
                        Invoice<span className="brand-accent">AI</span>
                    </span>
                </Link>

                <div className="sidebar-label">WORKSPACE</div>

                <nav className="sidebar-nav">
                    <Link to="/dashboard" className="nav-item active">
                        <LayoutDashboard size={21} />
                        <span>Dashboard</span>
                    </Link>

                    <Link to="/upload" className="nav-item">
                        <Upload size={21} />
                        <span>Upload Invoice</span>
                        <Plus className="nav-end-icon" size={18} />
                    </Link>

                    <Link to="/invoices" className="nav-item">
                        <Receipt size={21} />
                        <span>All Invoices</span>
                    </Link>

                    <Link to="/analytics" className="nav-item">
                        <ChartNoAxesCombined size={21} />
                        <span>Analytics</span>
                    </Link>
                </nav>

                <div className="sidebar-bottom">
                    <div className="intelligence-card">
                        <span className="intelligence-icon">
                            <TrendingUp size={23} />
                        </span>
                        <h4>Invoice intelligence</h4>
                        <p>Turn your expenses into insights.</p>

                        <div className="intelligence-progress">
                            <span
                                style={{
                                    width: `${processedPercentage}%`,
                                }}
                            />
                        </div>

                        <small>AI-powered workspace</small>
                    </div>

                    <Link to="/settings" className="nav-item settings-link">
                        <Settings size={21} />
                        <span>Settings</span>
                    </Link>

                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${
                            theme === "dark" ? "light" : "dark"
                        } theme`}
                        title={`Switch to ${
                            theme === "dark" ? "light" : "dark"
                        } theme`}
                    >
                        {theme === "dark" ? (
                            <Sun size={19} />
                        ) : (
                            <Moon size={19} />
                        )}
                    </button>

                    <div className="sidebar-divider" />

                    <div className="sidebar-profile">
                        <div className="profile-avatar">D</div>
                        <div className="profile-details">
                            <strong>Drishti Sharma</strong>
                            <span>Workspace owner</span>
                        </div>
                        <ChevronDown size={17} />
                    </div>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div className="breadcrumb">
                        <span>Workspace</span>
                        <span>/</span>
                        <strong>Dashboard</strong>
                    </div>

                    <div className="topbar-actions">
                        <label className="dashboard-search">
                            <Search size={17} />
                            <input
                                type="search"
                                placeholder="Search invoices..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                            <span className="search-shortcut">⌘ K</span>
                        </label>

                        <button
                            type="button"
                            className="icon-button"
                            onClick={fetchInvoices}
                            aria-label="Refresh dashboard"
                            title="Refresh dashboard"
                            disabled={loading}
                        >
                            <RefreshCw
                                size={19}
                                className={
                                    loading ? "dashboard-spinning" : ""
                                }
                            />
                        </button>

                        <div className="topbar-notification-wrapper">
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="Notifications"
                                title="Notifications"
                                aria-expanded={showNotifications}
                                onClick={() =>
                                    setShowNotifications((prev) => !prev)
                                }
                            >
                                <Bell size={20} />
                            </button>

                            {showNotifications && (
                                <div
                                    className={`notification-popup ${
                                        theme || "dark"
                                    }-theme`}
                                    role="status"
                                >
                                    <strong>Notifications</strong>
                                    <p>No notifications</p>
                                </div>
                            )}
                        </div>

                        <div className="topbar-avatar">D</div>
                    </div>
                </header>

                <div className="dashboard-content">
                    <section className="welcome-section">
                        <div>
                            <div className="section-eyebrow">
                                <span className="eyebrow-dot" />
                                YOUR FINANCIAL OVERVIEW
                            </div>

                            <h1>
                                Good morning, Drishti
                                <Sparkles
                                    className="welcome-sparkle"
                                    size={23}
                                />
                            </h1>

                            <p>
                                Here's what's happening with your invoices
                                today.
                            </p>
                        </div>

                        <Link to="/upload" className="upload-button">
                            <Plus size={20} />
                            Upload invoice
                        </Link>
                    </section>

                    {error && (
                        <div className="dashboard-error" role="alert">
                            <AlertCircle size={19} />
                            <span>{error}</span>
                            <button type="button" onClick={fetchInvoices}>
                                Try again
                            </button>
                        </div>
                    )}

                    <section className="stats-grid">
                        <article className="stat-card">
                            <div className="stat-top">
                                <span>Total expenses</span>
                                <span className="stat-icon blue">
                                    <Wallet size={22} />
                                </span>
                            </div>
                            <h2>{loading ? "—" : money(totalExpenses)}</h2>
                            <div className="stat-foot blue-text">
                                <span>Across saved invoices</span>
                            </div>
                        </article>

                        <article className="stat-card">
                            <div className="stat-top">
                                <span>Total invoices</span>
                                <span className="stat-icon purple">
                                    <FileText size={22} />
                                </span>
                            </div>
                            <h2>{loading ? "—" : invoices.length}</h2>
                            <div className="stat-foot blue-text">
                                <span>Saved in your database</span>
                            </div>
                        </article>

                        <article className="stat-card">
                            <div className="stat-top">
                                <span>Processed</span>
                                <span className="stat-icon green">
                                    <CircleCheck size={22} />
                                </span>
                            </div>
                            <h2>{loading ? "—" : processedCount}</h2>
                            <div className="stat-foot blue-text">
                                <strong>
                                    {loading ? "—" : `${processedPercentage}%`}
                                </strong>
                                <span>of all invoices</span>
                            </div>
                        </article>

                        <article className="stat-card">
                            <div className="stat-top">
                                <span>Pending review</span>
                                <span className="stat-icon orange">
                                    <Clock3 size={22} />
                                </span>
                            </div>
                            <h2>{loading ? "—" : pendingCount}</h2>
                            <div className="stat-foot orange-text">
                                <strong>
                                    {pendingCount > 0
                                        ? "Needs attention"
                                        : "All caught up"}
                                </strong>
                            </div>
                        </article>
                    </section>

                    <section className="charts-grid">
                        <article className="panel expense-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>Expense overview</h3>
                                    <p>Track your spending over time</p>
                                </div>

                                <label className="period-select">
                                    <select
                                        value={period}
                                        onChange={(event) =>
                                            setPeriod(event.target.value)
                                        }
                                        aria-label="Expense chart period"
                                    >
                                        <option>Last 3 months</option>
                                        <option>Last 6 months</option>
                                        <option>Last 12 months</option>
                                    </select>
                                    <ChevronDown size={16} />
                                </label>
                            </div>

                            <div className="chart-total">
                                <strong>{money(chartTotal)}</strong>
                            </div>
                            <p className="chart-caption">
                                Recorded expenses within the selected period
                            </p>

                            <div className="bar-chart">
                                <div className="chart-y-axis">
                                    <span>{money(maxMonthlyAmount)}</span>
                                    <span>{money(maxMonthlyAmount * 0.75)}</span>
                                    <span>{money(maxMonthlyAmount * 0.5)}</span>
                                    <span>{money(maxMonthlyAmount * 0.25)}</span>
                                    <span>₹0</span>
                                </div>

                                <div className={`bar-chart-area months-${monthCount}`}>
                                    {monthlyExpenses.map((item) => (
                                        <div
                                            className="bar-column"
                                            key={item.key}
                                            title={`${item.month}: ${money(
                                                item.amount
                                            )}`}
                                        >
                                            <div className="bar-track">
                                                <div
                                                    className={`bar-fill ${
                                                        item.amount > 0
                                                            ? "current"
                                                            : ""
                                                    }`}
                                                    style={{
                                                        height: `${
                                                            item.amount > 0
                                                                ? Math.max(
                                                                      3,
                                                                      (item.amount /
                                                                          maxMonthlyAmount) *
                                                                          100
                                                                  )
                                                                : 0
                                                        }%`,
                                                    }}
                                                />
                                            </div>
                                            <span>{item.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>

                        <article className="panel category-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>Expense categories</h3>
                                    <p>Where your money goes</p>
                                </div>
                                <span className="icon-button chart-menu">
                                    <MoreHorizontal size={21} />
                                </span>
                            </div>

                            <div className="donut-wrap">
                                <div
                                    className="donut-chart"
                                    style={{ background: categoryGradient }}
                                >
                                    <div className="donut-hole">
                                        <span>Total expenses</span>
                                        <strong>{money(totalExpenses)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="category-legend">
                                {categories.map((category) => (
                                    <div
                                        className="legend-row"
                                        key={category.name}
                                    >
                                        <span
                                            className="legend-dot"
                                            style={{
                                                background: category.color,
                                            }}
                                        />
                                        <span className="legend-name">
                                            {category.name}
                                        </span>
                                        <strong>{money(category.amount)}</strong>
                                    </div>
                                ))}

                                {!loading && categories.length === 0 && (
                                    <p className="empty-table">
                                        Upload an invoice to see categories.
                                    </p>
                                )}
                            </div>
                        </article>
                    </section>

                    <section className="panel recent-panel">
                        <div className="recent-heading">
                            <div>
                                <h3>Recent invoices</h3>
                                <p>
                                    Your latest invoice activity at a glance
                                </p>
                            </div>

                            <div className="recent-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleExportInvoice}
                                    disabled={
                                        loading || recentInvoices.length === 0
                                    }
                                    title={
                                        recentInvoices.length
                                            ? "Export the most recent invoice as PDF"
                                            : "No invoices available to export"
                                    }
                                >
                                    <Download size={16} />
                                    Export
                                </button>

                                <Link to="/invoices" className="view-all">
                                    View all <ArrowUpRight size={17} />
                                </Link>
                            </div>
                        </div>

                        <div className="invoice-table-wrap">
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th>INVOICE</th>
                                        <th>VENDOR</th>
                                        <th>DATE</th>
                                        <th>CATEGORY</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="empty-table"
                                            >
                                                Loading invoices...
                                            </td>
                                        </tr>
                                    ) : recentInvoices.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="empty-table"
                                            >
                                                {search
                                                    ? "No matching invoices found."
                                                    : "No invoices yet. Upload your first invoice."}
                                            </td>
                                        </tr>
                                    ) : (
                                        recentInvoices.map((invoice) => (
                                            <tr key={invoice._id}>
                                                <td>
                                                    <div className="invoice-id">
                                                        <span className="invoice-file-icon">
                                                            <FileText size={19} />
                                                        </span>
                                                        <strong>
                                                            {invoice.invoiceNumber ||
                                                                invoice.fileName ||
                                                                "Invoice"}
                                                        </strong>
                                                    </div>
                                                </td>

                                                <td className="vendor-cell">
                                                    {invoice.vendor || "Unknown"}
                                                </td>

                                                <td className="date-cell">
                                                    {formatDate(invoice.date)}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`category-tag ${String(
                                                            invoice.category ||
                                                                "uncategorized"
                                                        )
                                                            .toLowerCase()
                                                            .replace(
                                                                /[^a-z0-9]+/g,
                                                                "-"
                                                            )}`}
                                                    >
                                                        {invoice.category ||
                                                            "Uncategorized"}
                                                    </span>
                                                </td>

                                                <td className="amount-cell">
                                                    {money(invoice.total)}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`status ${
                                                            invoice.status ===
                                                            "Processed"
                                                                ? "processed"
                                                                : "processing"
                                                        }`}
                                                    >
                                                        <span />
                                                        {invoice.status ||
                                                            "Uploaded"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-footer">
                            <span>
                                Showing {loading ? "—" : recentInvoices.length}{" "}
                                of{" "}
                                {loading ? "—" : filteredInvoices.length} invoices
                            </span>
                            <Link to="/invoices">
                                See all invoices
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </section>

                    <footer className="dashboard-footer">
                        <span>© 2026 InvoiceAI</span>
                        <span>Intelligent invoicing, simplified.</span>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;