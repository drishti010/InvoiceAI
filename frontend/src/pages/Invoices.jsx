
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    RefreshCw,
    Search,
    FileText,
    Receipt,
    CheckCircle2,
    Clock3,
    AlertCircle,
    IndianRupee,
    MoreHorizontal,
    Trash2,
    X,
    Eye,
    Pencil,
    Save,
    Download
} from "lucide-react";
import "./Invoices.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices`;

const EMPTY_FORM = {
    vendor: "",
    invoiceNumber: "",
    date: "",
    total: "",
    category: "",
    itemsText: ""
};

// Escape HTML to safely display invoice data in exported documents.
const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

function Invoices({ theme }) {
    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [modalMode, setModalMode] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // Fetch all invoices.
    const fetchInvoices = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                setError("Please log in to view your invoices.");
                setInvoices([]);
                return;
            }

            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.status === 401) {
                setError("Your session has expired. Please log in again.");
                setInvoices([]);
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load invoices."
                );
            }

            setInvoices(
                Array.isArray(data.invoices) ? data.invoices : []
            );
        } catch (err) {
            console.error("Fetch invoices error:", err);
            setError(
                err.message || "Unable to connect to the backend."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Format currency.
    const formatAmount = (amount) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);

    // Format invoice date.
    const formatDate = (date) => {
        if (!date) return "—";

        const value = String(date);
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

        if (match) return value;

        const parsed = new Date(value);

        return Number.isNaN(parsed.getTime())
            ? value
            : parsed.toLocaleDateString("en-IN");
    };

    // =====================================================
    // EXPORT INDIVIDUAL INVOICE AS PDF
    // =====================================================

    const handleExportInvoice = (invoice) => {
        if (!invoice) return;

        const items = Array.isArray(invoice.items)
            ? invoice.items
            : [];

        const invoiceHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                <title>
                    Invoice - ${escapeHtml(
                        invoice.invoiceNumber ||
                        invoice.fileName ||
                        "Invoice"
                    )}
                </title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #172033;
                        background: #ffffff;
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
                        align-items: flex-start;
                        gap: 20px;
                        padding-bottom: 24px;
                        border-bottom: 2px solid #4b65f6;
                    }

                    .brand {
                        font-size: 25px;
                        font-weight: 800;
                        color: #172033;
                    }

                    .brand span {
                        color: #6558f5;
                    }

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

                    th,
                    td {
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
                        body {
                            padding: 0;
                        }

                        .invoice {
                            max-width: none;
                        }

                        .detail,
                        .total {
                            break-inside: avoid;
                        }
                    }

                    @media (max-width: 540px) {
                        body {
                            padding: 18px;
                        }

                        .details {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
            </head>

            <body>
                <main class="invoice">

                    <header class="header">
                        <div class="brand">
                            Invoice<span>AI</span>
                        </div>

                        <div style="text-align:right">
                            <div class="label">
                                Invoice record status
                            </div>

                            <div style="margin-top:8px;font-weight:700">
                                ${escapeHtml(invoice.status || "Uploaded")}
                            </div>
                        </div>
                    </header>

                    <h1>Invoice details</h1>

                    <div class="number">
                        ${escapeHtml(
                            invoice.invoiceNumber ||
                            "Invoice number unavailable"
                        )}
                    </div>

                    <section class="details">

                        <div class="detail">
                            <span class="label">Vendor</span>
                            <span class="value">
                                ${escapeHtml(invoice.vendor || "Unknown")}
                            </span>
                        </div>

                        <div class="detail">
                            <span class="label">Invoice date</span>
                            <span class="value">
                                ${escapeHtml(formatDate(invoice.date))}
                            </span>
                        </div>

                        <div class="detail">
                            <span class="label">Category</span>
                            <span class="value">
                                ${escapeHtml(
                                    invoice.category || "Uncategorized"
                                )}
                            </span>
                        </div>

                        <div class="detail">
                            <span class="label">Uploaded file</span>
                            <span class="value">
                                ${escapeHtml(
                                    invoice.fileName || "Not available"
                                )}
                            </span>
                        </div>

                    </section>

                    ${
                        items.length > 0
                            ? `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Extracted item</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        ${items
                                            .map(
                                                (item) => `
                                                    <tr>
                                                        <td>${escapeHtml(item)}</td>
                                                    </tr>
                                                `
                                            )
                                            .join("")}
                                    </tbody>
                                </table>
                            `
                            : `
                                <p>
                                    No line items were recorded for this invoice.
                                </p>
                            `
                    }

                    <section class="total">
                        <span class="label">Total amount</span>

                        <strong>
                            ${escapeHtml(formatAmount(invoice.total))}
                        </strong>
                    </section>

                    <footer class="footer">
                        Generated from InvoiceAI
                    </footer>

                </main>
            </body>
            </html>
        `;

        // Open a separate window for printing.
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert(
                "Please allow pop-ups for InvoiceAI and try again."
            );
            return;
        }

        // Prevent duplicate print dialogs.
        let hasPrinted = false;

        const printOnce = () => {
            if (hasPrinted || printWindow.closed) return;

            hasPrinted = true;
            printWindow.focus();
            printWindow.print();
        };

        printWindow.onload = printOnce;

        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();

        // Fallback for browsers that do not trigger onload.
        setTimeout(printOnce, 500);
    };

    // =====================================================
    // VIEW / EDIT INVOICE
    // =====================================================

    const getStatusIcon = (status) => {
        if (status === "Processed") {
            return <CheckCircle2 size={15} />;
        }

        if (status === "Failed") {
            return <AlertCircle size={15} />;
        }

        return <Clock3 size={15} />;
    };

    const openInvoiceDialog = (invoice, mode) => {
        setSelectedInvoice(invoice);
        setModalMode(mode);
        setFormError("");
        setOpenMenuId(null);

        setForm({
            vendor: invoice.vendor || "",
            invoiceNumber: invoice.invoiceNumber || "",
            date: invoice.date || "",
            total: String(invoice.total ?? ""),
            category: invoice.category || "Uncategorized",
            itemsText: Array.isArray(invoice.items)
                ? invoice.items.join("\n")
                : ""
        });
    };

    const closeInvoiceDialog = () => {
        if (saving) return;

        setSelectedInvoice(null);
        setModalMode(null);
        setFormError("");
    };

    const updateForm = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    };

    const handleSaveEdit = async (event) => {
        event.preventDefault();

        if (!selectedInvoice || saving) return;

        const token = localStorage.getItem("token");

        if (!token) {
            setFormError("Please log in again.");
            return;
        }

        const numericTotal = Number(form.total);

        if (!form.vendor.trim() || !form.date.trim()) {
            setFormError("Vendor and date are required.");
            return;
        }

        if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
            setFormError("Enter a valid positive invoice amount.");
            return;
        }

        setSaving(true);
        setFormError("");

        try {
            const payload = {
                vendor: form.vendor.trim(),
                invoiceNumber: form.invoiceNumber.trim(),
                date: form.date.trim(),
                total: numericTotal,
                category: form.category.trim() || "Uncategorized",
                items: form.itemsText
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean)
            };

            const response = await fetch(
                `${API_URL}/${encodeURIComponent(selectedInvoice._id)}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update invoice."
                );
            }

            setInvoices((current) =>
                current.map((invoice) =>
                    invoice._id === selectedInvoice._id
                        ? data.invoice
                        : invoice
                )
            );

            setSelectedInvoice(null);
            setModalMode(null);
        } catch (err) {
            console.error("Update invoice error:", err);

            setFormError(
                err.message || "Unable to update invoice."
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // DELETE INVOICE
    // =====================================================

    const handleDelete = async () => {
        if (!invoiceToDelete || deleting) return;

        const token = localStorage.getItem("token");

        if (!token) {
            setDeleteError("Please log in again.");
            return;
        }

        setDeleting(true);
        setDeleteError("");

        try {
            const response = await fetch(
                `${API_URL}/${encodeURIComponent(invoiceToDelete._id)}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to delete invoice."
                );
            }

            setInvoices((current) =>
                current.filter(
                    (invoice) => invoice._id !== invoiceToDelete._id
                )
            );

            setInvoiceToDelete(null);
            setOpenMenuId(null);
        } catch (err) {
            console.error("Delete invoice error:", err);

            setDeleteError(
                err.message || "Unable to delete invoice."
            );
        } finally {
            setDeleting(false);
        }
    };

    // =====================================================
    // SEARCH AND SUMMARY
    // =====================================================

    const filteredInvoices = invoices.filter((invoice) => {
        const searchText = search.toLowerCase();

        return [
            invoice.vendor,
            invoice.invoiceNumber,
            invoice.fileName,
            invoice.category,
            invoice.status
        ].some((value) =>
            String(value || "").toLowerCase().includes(searchText)
        );
    });

    const totalExpenses = invoices.reduce(
        (sum, invoice) => sum + (Number(invoice.total) || 0),
        0
    );

    // =====================================================
    // PAGE UI
    // =====================================================

    return (
        <div className={`invoices-page ${theme || "dark"}-theme`}>

            {/* Top navigation */}

            <header className="invoices-topbar">
                <Link to="/dashboard" className="invoices-back">
                    <ArrowLeft size={18} />
                    Dashboard
                </Link>

                <div className="invoices-brand">
                    <span className="invoices-brand-icon">
                        <FileText size={20} />
                    </span>

                    Invoice<span>AI</span>
                </div>
            </header>

            <main className="invoices-content">

                {/* Page heading */}

                <div className="invoices-heading">
                    <div>
                        <p className="invoices-eyebrow">
                            YOUR FINANCIAL WORKSPACE
                        </p>

                        <h1>All Invoices</h1>

                        <p className="invoices-subtitle">
                            View and manage your uploaded invoices.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="invoices-refresh"
                        onClick={fetchInvoices}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading ? "invoices-spinning" : ""
                            }
                        />
                        Refresh
                    </button>
                </div>

                {/* Summary cards */}

                <section className="invoices-summary">

                    <div className="invoices-summary-icon">
                        <Receipt size={22} />
                    </div>

                    <div>
                        <p>Total invoices</p>
                        <h2>{invoices.length}</h2>
                    </div>

                    <div className="invoices-summary-divider" />

                    <div>
                        <p>Processed</p>

                        <h2>
                            {invoices.filter(
                                (invoice) =>
                                    invoice.status === "Processed"
                            ).length}
                        </h2>
                    </div>

                    <div className="invoices-summary-divider" />

                    <div>
                        <p>Total recorded expenses</p>
                        <h2>{formatAmount(totalExpenses)}</h2>
                    </div>

                </section>

                {/* Invoice records */}

                <section className="invoices-panel">

                    <div className="invoices-panel-heading">

                        <div>
                            <h2>Invoice records</h2>
                            <p>Your invoices saved in the database</p>
                        </div>

                        <label className="invoices-search">
                            <Search size={17} />

                            <input
                                type="search"
                                placeholder="Search invoices..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </label>

                    </div>

                    {/* Loading / Error / Empty / Table */}

                    {loading ? (
                        <div className="invoices-message">
                            <RefreshCw
                                size={22}
                                className="invoices-spinning"
                            />

                            <p>Loading your invoices...</p>
                        </div>
                    ) : error ? (
                        <div className="invoices-message invoices-error">
                            <AlertCircle size={24} />

                            <p>{error}</p>

                            <button
                                type="button"
                                className="invoices-refresh"
                                onClick={fetchInvoices}
                            >
                                Try again
                            </button>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="invoices-message">
                            <FileText size={32} />

                            <h3>
                                {search
                                    ? "No matching invoices"
                                    : "No invoices yet"}
                            </h3>

                            <p>
                                {search
                                    ? "Try another search term."
                                    : "Upload an invoice to see its extracted details here."}
                            </p>
                        </div>
                    ) : (
                        <div className="invoices-table-wrap">

                            <table className="invoices-table">

                                <thead>
                                    <tr>
                                        <th>Vendor / Invoice</th>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th aria-label="Actions" />
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredInvoices.map((invoice) => (
                                        <tr key={invoice._id}>

                                            <td>
                                                <div className="invoices-vendor">

                                                    <span className="invoices-file-icon">
                                                        <FileText size={18} />
                                                    </span>

                                                    <div>
                                                        <strong>
                                                            {invoice.vendor || "Unknown"}
                                                        </strong>

                                                        <small>
                                                            {invoice.invoiceNumber ||
                                                                invoice.fileName ||
                                                                "Invoice"}
                                                        </small>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                {formatDate(invoice.date)}
                                            </td>

                                            <td>
                                                <span className="invoices-category">
                                                    {invoice.category || "Other"}
                                                </span>
                                            </td>

                                            <td className="invoices-amount">
                                                <IndianRupee
                                                    size={14}
                                                    className="invoices-rupee-icon"
                                                />

                                                {formatAmount(invoice.total)
                                                    .replace("₹", "")
                                                    .trim()}
                                            </td>

                                            <td>
                                                <span
                                                    className={`invoices-status invoices-status-${String(
                                                        invoice.status || "Uploaded"
                                                    ).toLowerCase()}`}
                                                >
                                                    {getStatusIcon(invoice.status)}
                                                    {invoice.status || "Uploaded"}
                                                </span>
                                            </td>

                                            {/* Individual invoice actions */}

                                            <td className="invoice-actions-cell">

                                                <div className="invoice-actions-menu">

                                                    <button
                                                        type="button"
                                                        className="invoice-more-button"
                                                        aria-label={`Options for ${invoice.vendor || "invoice"}`}
                                                        aria-expanded={
                                                            openMenuId === invoice._id
                                                        }
                                                        onClick={() =>
                                                            setOpenMenuId((current) =>
                                                                current === invoice._id
                                                                    ? null
                                                                    : invoice._id
                                                            )
                                                        }
                                                    >
                                                        <MoreHorizontal size={20} />
                                                    </button>

                                                    {openMenuId === invoice._id && (
                                                        <div className="invoice-dropdown">

                                                            {/* View */}

                                                            <button
                                                                type="button"
                                                                className="invoice-menu-option"
                                                                onClick={() =>
                                                                    openInvoiceDialog(
                                                                        invoice,
                                                                        "view"
                                                                    )
                                                                }
                                                            >
                                                                <Eye size={16} />
                                                                View invoice
                                                            </button>

                                                            {/* Edit */}

                                                            <button
                                                                type="button"
                                                                className="invoice-menu-option"
                                                                onClick={() =>
                                                                    openInvoiceDialog(
                                                                        invoice,
                                                                        "edit"
                                                                    )
                                                                }
                                                            >
                                                                <Pencil size={16} />
                                                                Edit invoice
                                                            </button>

                                                            {/* Export PDF */}

                                                            <button
                                                                type="button"
                                                                className="invoice-menu-option invoice-export-option"
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    handleExportInvoice(invoice);
                                                                }}
                                                            >
                                                                <Download size={16} />
                                                                Export as PDF
                                                            </button>

                                                            {/* Delete */}

                                                            <button
                                                                type="button"
                                                                className="invoice-delete-option"
                                                                onClick={() => {
                                                                    setInvoiceToDelete(invoice);
                                                                    setDeleteError("");
                                                                    setOpenMenuId(null);
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                                Delete invoice
                                                            </button>

                                                        </div>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    ))}

                                </tbody>

                            </table>

                        </div>
                    )}

                    {/* Table footer */}

                    {!loading && !error && invoices.length > 0 && (
                        <div className="invoices-table-footer">
                            Showing {filteredInvoices.length} of{" "}
                            {invoices.length} invoices
                        </div>
                    )}

                </section>

            </main>

            {/* =================================================
                VIEW / EDIT INVOICE MODAL
            ================================================= */}

            {selectedInvoice && modalMode && (
                <div className="invoice-modal-backdrop">

                    <section
                        className="invoice-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="invoice-dialog-title"
                    >

                        <button
                            type="button"
                            className="invoice-modal-close"
                            aria-label="Close dialog"
                            disabled={saving}
                            onClick={closeInvoiceDialog}
                        >
                            <X size={19} />
                        </button>

                        <div className="invoice-dialog-heading">

                            <span className="invoices-file-icon">
                                {modalMode === "edit"
                                    ? <Pencil size={20} />
                                    : <FileText size={20} />}
                            </span>

                            <div>
                                <h2 id="invoice-dialog-title">
                                    {modalMode === "edit"
                                        ? "Edit invoice"
                                        : "Invoice details"}
                                </h2>

                                <p>
                                    {modalMode === "edit"
                                        ? "Correct the extracted information and save your changes."
                                        : "Review the information saved for this invoice."}
                                </p>
                            </div>

                        </div>

                        {/* View mode */}

                        {modalMode === "view" ? (
                            <div className="invoice-view-fields">

                                <div>
                                    <span>Vendor</span>
                                    <strong>
                                        {selectedInvoice.vendor || "Unknown"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Invoice number</span>
                                    <strong>
                                        {selectedInvoice.invoiceNumber || "Not detected"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Date</span>
                                    <strong>
                                        {formatDate(selectedInvoice.date)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Total amount</span>
                                    <strong>
                                        {formatAmount(selectedInvoice.total)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Category</span>
                                    <strong>
                                        {selectedInvoice.category || "Uncategorized"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Status</span>
                                    <strong>
                                        {selectedInvoice.status || "Uploaded"}
                                    </strong>
                                </div>

                                <div className="invoice-view-items">
                                    <span>Extracted items</span>

                                    {Array.isArray(selectedInvoice.items) &&
                                    selectedInvoice.items.length > 0 ? (
                                        <ul>
                                            {selectedInvoice.items.map(
                                                (item, index) => (
                                                    <li key={`${index}-${item}`}>
                                                        {item}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    ) : (
                                        <p>No line items were extracted.</p>
                                    )}
                                </div>

                                <div>
                                    <span>Uploaded file</span>
                                    <strong>
                                        {selectedInvoice.fileName || "Not available"}
                                    </strong>
                                </div>

                            </div>
                        ) : (

                            /* Edit mode */

                            <form
                                onSubmit={handleSaveEdit}
                                className="invoice-edit-form"
                            >

                                <label>
                                    Vendor

                                    <input
                                        name="vendor"
                                        value={form.vendor}
                                        onChange={updateForm}
                                        maxLength={150}
                                        required
                                    />
                                </label>

                                <label>
                                    Invoice number

                                    <input
                                        name="invoiceNumber"
                                        value={form.invoiceNumber}
                                        onChange={updateForm}
                                        maxLength={100}
                                    />
                                </label>

                                <label>
                                    Invoice date

                                    <input
                                        name="date"
                                        value={form.date}
                                        onChange={updateForm}
                                        placeholder="DD-MM-YYYY"
                                        maxLength={50}
                                        required
                                    />
                                </label>

                                <label>
                                    Total amount (₹)

                                    <input
                                        name="total"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.total}
                                        onChange={updateForm}
                                        required
                                    />
                                </label>

                                <label>
                                    Category

                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={updateForm}
                                        maxLength={80}
                                        placeholder="e.g. IT, Travel, stationary"
                                    />
                                </label>

                                <label className="invoice-edit-items">
                                    Invoice items (one item per line)

                                    <textarea
                                        name="itemsText"
                                        value={form.itemsText}
                                        onChange={updateForm}
                                        rows={4}
                                    />
                                </label>

                                {formError && (
                                    <p
                                        className="invoice-delete-error"
                                        role="alert"
                                    >
                                        {formError}
                                    </p>
                                )}

                                <div className="invoice-modal-actions">

                                    <button
                                        type="button"
                                        className="invoice-cancel-button"
                                        disabled={saving}
                                        onClick={closeInvoiceDialog}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="invoice-save-button"
                                        disabled={saving}
                                    >
                                        <Save size={16} />

                                        {saving
                                            ? "Saving..."
                                            : "Save changes"}
                                    </button>

                                </div>

                            </form>
                        )}

                        {/* View modal actions */}

                        {modalMode === "view" && (
                            <div className="invoice-modal-actions">

                                <button
                                    type="button"
                                    className="invoice-cancel-button"
                                    onClick={closeInvoiceDialog}
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="invoice-save-button"
                                    onClick={() =>
                                        openInvoiceDialog(
                                            selectedInvoice,
                                            "edit"
                                        )
                                    }
                                >
                                    <Pencil size={16} />
                                    Edit invoice
                                </button>

                            </div>
                        )}

                    </section>

                </div>
            )}

            {/* =================================================
                DELETE CONFIRMATION MODAL
            ================================================= */}

            {invoiceToDelete && (
                <div className="invoice-modal-backdrop">

                    <section
                        className="invoice-delete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-invoice-title"
                    >

                        <button
                            type="button"
                            className="invoice-modal-close"
                            aria-label="Close dialog"
                            disabled={deleting}
                            onClick={() => {
                                setInvoiceToDelete(null);
                                setDeleteError("");
                            }}
                        >
                            <X size={19} />
                        </button>

                        <div className="invoice-delete-icon">
                            <Trash2 size={23} />
                        </div>

                        <h2 id="delete-invoice-title">
                            Delete this invoice?
                        </h2>

                        <p>
                            Are you sure you want to delete{" "}
                            <strong>
                                {invoiceToDelete.vendor || "this invoice"}
                            </strong>
                            ? This action cannot be undone.
                        </p>

                        {deleteError && (
                            <p
                                className="invoice-delete-error"
                                role="alert"
                            >
                                {deleteError}
                            </p>
                        )}

                        <div className="invoice-modal-actions">

                            <button
                                type="button"
                                className="invoice-cancel-button"
                                disabled={deleting}
                                onClick={() => {
                                    setInvoiceToDelete(null);
                                    setDeleteError("");
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="invoice-confirm-delete-button"
                                disabled={deleting}
                                onClick={handleDelete}
                            >
                                {deleting
                                    ? "Deleting..."
                                    : "Delete invoice"}
                            </button>

                        </div>

                    </section>

                </div>
            )}

        </div>
    );
}

export default Invoices;
