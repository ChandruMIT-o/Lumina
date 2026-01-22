from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil
from pathlib import Path
from utils import parse_docx_variables, maximize_fidelity_preview
from docxtpl import DocxTemplate
from docx2pdf import convert
import pythoncom

app = FastAPI(title="Lumina Document Automation")

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
PREVIEW_DIR = BASE_DIR / "previews"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

# Mount previews directory to serve images
app.mount("/previews", StaticFiles(directory=PREVIEW_DIR), name="previews")

@app.get("/")
async def root():
    return {"message": "Lumina Backend Operational"}

@app.post("/api/upload")
async def upload_template(file: UploadFile = File(...)):
    """
    Upload a docx template and extracting variables.
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")
    
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    variables = parse_docx_variables(file_path)
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "variables": variables
    }

@app.post("/api/preview")
async def generate_preview(file_id: str = Form(...), filename: str = Form(...), data: str = Form(...)):
    """
    Generate a high-fidelity preview image from the filled template.
    Data is expected loosely as a JSON string of key-value pairs.
    """
    import json
    try:
        data_dict = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    file_path = UPLOAD_DIR / f"{file_id}_{filename}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Generate preview images
    image_paths = maximize_fidelity_preview(file_path, data_dict, PREVIEW_DIR)
    
    # Convert absolute paths to URLs
    image_urls = [f"/previews/{Path(p).name}" for p in image_paths]
    
    return {"images": image_urls}

@app.post("/api/export")
async def export_document(file_id: str = Form(...), filename: str = Form(...), data: str = Form(...), format: str = Form(...)):
    import json
    from fastapi.responses import FileResponse
    try:
        data_dict = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    file_path = UPLOAD_DIR / f"{file_id}_{filename}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    # Reuse utility but maybe separate rendering?
    # Ideally we'd have a generate_document function. 
    # For now, inline or quick duplicate for safety.
    
    doc = DocxTemplate(file_path)
    doc.render(data_dict)
    
    export_id = str(uuid.uuid4())
    output_docx = PREVIEW_DIR / f"export_{export_id}.docx"
    doc.save(output_docx)
    
    if format == 'pdf':
        output_pdf = PREVIEW_DIR / f"export_{export_id}.pdf"
        try:
           pythoncom.CoInitialize()
           convert(str(output_docx), str(output_pdf))
           return FileResponse(output_pdf, filename=f"document.pdf", media_type='application/pdf')
        except Exception as e:
           print(e)
           raise HTTPException(status_code=500, detail="PDF conversion failed")
    else:
        return FileResponse(output_docx, filename=f"document.docx", media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
