# InvoiceAI — AI-Powered Invoice Processing & Expense Classification

InvoiceAI is a full-stack application that helps users process invoices, extract important information, classify expenses, and review invoice records through a dashboard.

## Features

- **Invoice Upload:** Upload invoice documents for processing.
- **OCR & Data Extraction:** Extract invoice information such as invoice number, date, and total amount.
- **Expense Classification:** Predict expense categories using machine learning.
- **Dashboard:** View saved invoices and expense summaries.
- **Invoice Management:** Review, edit, and delete invoice records.
- **User Authentication:** Register, log in, and manage account settings.
- **Password Reset:** Reset forgotten passwords through an email-based workflow.

## Tech Stack

**Frontend:** React, Vite, JavaScript, CSS  
**Backend:** Node.js, Express.js  
**Database:** MongoDB  
**Machine Learning:** Python, scikit-learn, TF-IDF, Logistic Regression  
**OCR:** Tesseract  
**ML API:** FastAPI  
**Authentication:** JWT and bcrypt

## Project Structure

```text
InvoiceAI/
├── backend/       # Express API, authentication, invoice routes
├── frontend/      # React user interface
├── ml-service/    # Python OCR and ML service
├── .gitignore
├── package.json
└── package-lock.json
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3
- MongoDB connection
- Tesseract OCR installed and configured

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/drishti010/InvoiceAI.git
   cd InvoiceAI
   ```

2. Install the dependencies for the root project and the frontend/backend folders as required by their respective `package.json` files.

3. Configure environment variables locally. Never commit `.env` files or credentials.

4. Set up the Python environment and install the dependencies listed by the ML service.

5. Start the backend, frontend, and ML service using their respective development commands.

Refer to the individual project folders for service-specific configuration.

## Security

Keep database credentials, JWT secrets, email passwords, and API keys in local environment variables. Never publish real credentials in source code or repository history.

## Project Status

Developed as a full-stack AI/ML project for learning and portfolio demonstration.
