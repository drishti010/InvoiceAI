from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import joblib
import pymupdf
import pytesseract
import io
import os

from PIL import Image
from extractor import extract_invoice_data


app = FastAPI(title="AI Invoice ML Service")


# --------------------------------------------------
# 1. Configure Tesseract OCR on Windows
# --------------------------------------------------

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)
# --------------------------------------------------
# 2. Load the trained ML pipeline.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR, "model", "expense_pipeline.pkl"
)

pipeline = joblib.load(MODEL_PATH)


# --------------------------------------------------
# 3. Request model for category prediction
# --------------------------------------------------

class PredictionRequest(BaseModel):
    description: str


# --------------------------------------------------
# 4. Home endpoint
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Invoice ML Service is running!"
    }


# --------------------------------------------------
# 5. Predict expense category
# --------------------------------------------------

@app.post("/predict")
def predict_category(request: PredictionRequest):

    description = request.description.strip()

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Description cannot be empty"
        )

    prediction = pipeline.predict([description])

    return {
        "description": description,
        "category": str(prediction[0])
    }


# --------------------------------------------------
# 6. Extract text from PDF or image
# --------------------------------------------------

def read_invoice_text(file_bytes, filename):

    extension = os.path.splitext(filename)[1].lower()

    try:
        if extension == ".pdf":

            text_parts = []

            with pymupdf.open(
                stream=file_bytes,
                filetype="pdf"
            ) as pdf:

                for page in pdf:

                    pix = page.get_pixmap(
                        matrix=pymupdf.Matrix(2, 2)
                    )

                    image = Image.open(
                        io.BytesIO(pix.tobytes("png"))
                    )

                    text = pytesseract.image_to_string(image)
                    text_parts.append(text)

            return "\n".join(text_parts)

        elif extension in [".jpg", ".jpeg", ".png"]:

            image = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(image)

        else:
            raise HTTPException(
                status_code=400,
                detail="Only PDF, JPG and PNG files are supported"
            )

    except HTTPException:
        raise

    except Exception as error:
        print("OCR error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Could not read the uploaded invoice"
        )


# --------------------------------------------------
# 7. Process uploaded invoice
# --------------------------------------------------

@app.post("/process-invoice")
async def process_invoice(
    invoice: UploadFile = File(...)
):

    try:
        if not invoice.filename:
            raise HTTPException(
                status_code=400,
                detail="Invoice filename is missing"
            )

        filename = invoice.filename

        file_bytes = await invoice.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty"
            )

        # Extract text using OCR
        text = read_invoice_text(file_bytes, filename)

        print("\n--- OCR TEXT START ---")
        print(text)
        print("--- OCR TEXT END ---\n")

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="No readable text found in the invoice"
            )

        # Extract invoice fields
        extracted = extract_invoice_data(text)

        # Build description for ML classification
        items = extracted.get("items") or []
        description = " ".join(items).strip()

        if not description:
            description = text

        # Predict category using the complete pipeline
        prediction = pipeline.predict([description])

        category = str(prediction[0])

        print("Classification description:", description)
        print("Predicted category:", category)

        # Return extracted information
        return {
            "message": "Invoice processed successfully",
            "fileName": filename,
            "ocrText": text,
            "vendor": extracted.get("vendor"),
            "invoiceNumber": extracted.get("invoiceNumber"),
            "date": extracted.get("date"),
            "total": extracted.get("total"),
            "items": items,
            "category": category,
            "validationErrors": extracted.get(
                "validationErrors", []
            )
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Invoice processing error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Failed to process invoice"
        )

    finally:
        await invoice.close()