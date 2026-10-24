
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    FileUp,
    FileText,
    CheckCircle2,
    AlertCircle,
    LoaderCircle
} from "lucide-react";
import "./UploadInvoice.css";

const API_URL = "http://localhost:5000/api/invoices";

const STANDARD_CATEGORIES = [
    "IT",
    "Travel",
    "Food",
    "Office",
    "Other",
    "Uncategorized"
];

function formatCurrency(value) {
    if (value == null || value === "") {
        return "Not detected";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value));
}

function UploadInvoice() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [pendingUploadId, setPendingUploadId] = useState("");
    const [category, setCategory] = useState("Uncategorized");
    const [customCategory, setCustomCategory] = useState("");
    const [vendor, setVendor] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [date, setDate] = useState("");
    const [total, setTotal] = useState("");
    const [itemsText, setItemsText] = useState("");

    const navigate = useNavigate();

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0];

        setError("");
        setResult(null);
        setPendingUploadId("");

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            setFile(null);
            setError("Please select a PDF, JPG, or PNG invoice.");
            event.target.value = "";
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setFile(null);
            setError("The file must be 5 MB or smaller.");
            event.target.value = "";
            return;
        }

        setFile(selectedFile);
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!file) {
            setError("Please choose an invoice file first.");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("invoice", file);

            const response = await fetch(`${API_URL}/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.status === 401) {
                setError("Your session has expired. Please log in again.");
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Invoice extraction failed.");
            }

            if (!data.pendingUploadId || !data.extractedInvoice) {
                throw new Error(
                    "The backend response is missing extracted invoice details. Check that the updated backend code is running."
                );
            }

            const extracted = data.extractedInvoice;

            setPendingUploadId(data.pendingUploadId);
            setResult(data);
            setVendor(extracted.vendor || "");
            setInvoiceNumber(extracted.invoiceNumber || "");
            setDate(extracted.date || "");
            setTotal(extracted.total ?? "");
            setItemsText(
                Array.isArray(extracted.items)
                    ? extracted.items.join("\n")
                    : ""
            );

            const predicted = extracted.predictedCategory ||
                extracted.category ||
                "Uncategorized";

            const matchingCategory = STANDARD_CATEGORIES.find(
                item => item.toLowerCase() === predicted.toLowerCase()
            );

            if (matchingCategory) {
                setCategory(matchingCategory);
                setCustomCategory("");
            } else {
                setCategory("Custom");
                setCustomCategory(predicted);
            }
        } catch (err) {
            console.error("Invoice upload error:", err);
            setError(
                err.message ||
                "Unable to connect to the backend. Check that it is running."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (event) => {
        event.preventDefault();

        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }
        
        console.log("Pending upload ID being sent:", pendingUploadId);
        if (!pendingUploadId) {
            setError("Please upload the invoice again before confirming.");
            return;
        }

        const finalCategory = category === "Custom"
            ? customCategory.trim()
            : category;

        if (!finalCategory) {
            setError("Please enter a custom category.");
            return;
        }

        if (!vendor.trim() || !date.trim() ||
            total === "" || !Number.isFinite(Number(total)) ||
            Number(total) <= 0) {
            setError("Enter a vendor, date, and a valid positive total.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    pendingUploadId,
                    vendor: vendor.trim(),
                    invoiceNumber: invoiceNumber.trim(),
                    date: date.trim(),
                    total: Number(total),
                    items: itemsText
                        .split("\n")
                        .map(item => item.trim())
                        .filter(Boolean),
                    category: finalCategory
                })
            });

            const data = await response.json();

            if (response.status === 401) {
                setError("Your session has expired. Please log in again.");
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Unable to save invoice.");
            }

            setResult({
                message: data.message || "Invoice saved successfully.",
                invoice: data.invoice
            });
            setPendingUploadId("");
            setFile(null);
            setCategory("Uncategorized");
            setCustomCategory("");
        } catch (err) {
            console.error("Invoice confirmation error:", err);
            setError(err.message || "Unable to save the invoice.");
        } finally {
            setSaving(false);
        }
    };

    const extractedInvoice = result?.extractedInvoice;
    const savedInvoice = result?.invoice;
    const validationErrors = extractedInvoice?.validationErrors || [];

    return (
        <div className="upload-invoice-page">
            <header className="upload-invoice-header">
                <Link to="/dashboard" className="upload-back-link">
                    <ArrowLeft size={18} />
                    Dashboard
                </Link>

                <div className="upload-brand">
                    <span className="upload-brand-icon">
                        <FileText size={21} />
                    </span>
                    <span>
                        Invoice<span className="upload-brand-accent">AI</span>
                    </span>
                </div>
            </header>

            <main className="upload-invoice-main">
                <p className="upload-eyebrow">INVOICE INTELLIGENCE</p>
                <h1>Upload an invoice</h1>
                <p className="upload-description">
                    Extract invoice details, review the results, and confirm
                    the expense category before saving.
                </p>

                <form className="upload-card" onSubmit={handleUpload}>
                    <label className="upload-dropzone">
                        <span className="upload-file-icon">
                            <FileUp size={30} />
                        </span>

                        <strong>
                            {file ? file.name : "Choose an invoice file"}
                        </strong>

                        <span className="upload-file-hint">
                            {file
                                ? `${(file.size / 1024).toFixed(1)} KB · Ready to upload`
                                : "PDF, JPG or PNG · Maximum 5 MB"}
                        </span>

                        <span className="upload-choose-button">
                            Browse files
                        </span>

                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            onChange={handleFileChange}
                            disabled={loading || saving || Boolean(pendingUploadId)}
                        />
                    </label>

                    {error && (
                        <div className="upload-message upload-message-error">
                            <AlertCircle size={19} />
                            <span>{error}</span>
                        </div>
                    )}

                    {!pendingUploadId && !savedInvoice && (
                        <button
                            className="upload-submit-button"
                            type="submit"
                            disabled={loading || saving || !file}
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle size={18} className="upload-spinner" />
                                    Extracting details...
                                </>
                            ) : (
                                <>
                                    <FileUp size={18} />
                                    Extract invoice details
                                </>
                            )}
                        </button>
                    )}

                    {extractedInvoice && pendingUploadId && (
                        <div className="upload-success">
                            <div className="upload-message upload-message-success">
                                <CheckCircle2 size={20} />
                                <span>
                                    {result.message ||
                                        "Details extracted. Review before saving."}
                                </span>
                            </div>

                            {validationErrors.length > 0 && (
                                <div className="upload-message upload-message-error">
                                    <AlertCircle size={19} />
                                    <span>
                                        Please review: {validationErrors.join("; ")}
                                    </span>
                                </div>
                            )}

                            <div className="upload-result-details">
                                <p>
                                    <span>Vendor</span>
                                    <strong>{extractedInvoice.vendor || "Not detected"}</strong>
                                </p>
                                <p>
                                    <span>Invoice number</span>
                                    <strong>{extractedInvoice.invoiceNumber || "Not detected"}</strong>
                                </p>
                                <p>
                                    <span>Detected total</span>
                                    <strong>{formatCurrency(extractedInvoice.total)}</strong>
                                </p>
                                <p>
                                    <span>AI category suggestion</span>
                                    <strong>
                                        {extractedInvoice.predictedCategory ||
                                            extractedInvoice.category ||
                                            "Uncategorized"}
                                    </strong>
                                </p>
                            </div>

                            <h2>Review invoice details</h2>

                            <label>
                                Vendor
                                <input
                                    type="text"
                                    value={vendor}
                                    onChange={event => setVendor(event.target.value)}
                                    required
                                />
                            </label>

                            <label>
                                Invoice number
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={event => setInvoiceNumber(event.target.value)}
                                    placeholder="Optional"
                                />
                            </label>

                            <label>
                                Invoice date
                                <input
                                    type="text"
                                    value={date}
                                    onChange={event => setDate(event.target.value)}
                                    placeholder="e.g. 10-10-2026"
                                    required
                                />
                            </label>

                            <label>
                                Total amount (₹)
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={total}
                                    onChange={event => setTotal(event.target.value)}
                                    required
                                />
                            </label>

                            <label>
                                Invoice items (one per line)
                                <textarea
                                    value={itemsText}
                                    onChange={event => setItemsText(event.target.value)}
                                    rows={4}
                                    placeholder="Enter invoice items"
                                />
                            </label>

                            <label>
                                Expense category
                                <select
                                    value={category}
                                    onChange={event => setCategory(event.target.value)}
                                >
                                    {STANDARD_CATEGORIES.map(item => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                    <option value="Custom">Custom category</option>
                                </select>
                            </label>

                            {category === "Custom" && (
                                <label>
                                    Enter custom category
                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={event =>
                                            setCustomCategory(event.target.value)
                                        }
                                        maxLength={80}
                                        placeholder="e.g. Healthcare, Marketing"
                                        required
                                    />
                                </label>
                            )}

                            <button
                                className="upload-submit-button"
                                type="button"
                                disabled={saving}
                                onClick={handleConfirm}
                            >
                                {saving ? (
                                    <>
                                        <LoaderCircle size={18} className="upload-spinner" />
                                        Saving invoice...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Confirm and save invoice
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {savedInvoice && (
                        <div className="upload-success">
                            <div className="upload-message upload-message-success">
                                <CheckCircle2 size={20} />
                                <span>{result.message}</span>
                            </div>

                            <div className="upload-result-details">
                                <p>
                                    <span>Vendor</span>
                                    <strong>{savedInvoice.vendor}</strong>
                                </p>
                                <p>
                                    <span>Total</span>
                                    <strong>{formatCurrency(savedInvoice.total)}</strong>
                                </p>
                                <p>
                                    <span>Saved category</span>
                                    <strong>{savedInvoice.category}</strong>
                                </p>
                            </div>

                            <Link
                                to="/invoices"
                                className="upload-view-invoices"
                            >
                                View all invoices
                            </Link>
                        </div>
                    )}

                    <p className="upload-security-note">
                        Review extracted data carefully before confirming.
                    </p>
                </form>
            </main>
        </div>
    );
}

export default UploadInvoice;
