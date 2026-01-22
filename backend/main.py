from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
import shutil
from pathlib import Path
from utils import parse_docx_variables, maximize_fidelity_preview, process_semantic_variables
from docxtpl import DocxTemplate
from docx2pdf import convert
import pythoncom

app = FastAPI(title="Lumina Document Automation")

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
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

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_details = traceback.format_exc()
    print(f"Global Error: {error_details}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc), "trace": error_details.splitlines()},
    )

@app.post("/api/upload")
async def upload_template(file: UploadFile = File(...), delimiter_start: str = Form("{{"), delimiter_end: str = Form("}}")):
    """
    Upload a docx template and extracting variables.
    """
    try:
        if not file.filename.endswith(".docx"):
            raise HTTPException(status_code=400, detail="Only .docx files are supported")
        
        file_id = str(uuid.uuid4())
        # Parse and clean the file immediately
        # Save raw first (optional, but good for debug) - actually process_semantic reads from path
        # so we save raw first.
        raw_path = UPLOAD_DIR / f"raw_{file_id}_{file.filename}"
        
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = process_semantic_variables(raw_path, delimiter_start, delimiter_end)
        
        # The clean file is at result['clean_path']
        # We should rename or track it as the "main" file for this ID
        # Let's rename clean path to the standard path expected by other endpoints
        final_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
        if result['clean_path'].exists():
            os.replace(result['clean_path'], final_path)
        else:
            # Fallback if no cleaning happened (shouldn't happen with current logic but valid safety)
             shutil.copy(raw_path, final_path)
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "variables": result['variables'] # This is now a list of dicts: [{key, type, required...}]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/preview")
async def generate_preview(
    file_id: str = Form(...), 
    filename: str = Form(...), 
    data: str = Form(...),
    delimiter_start: str = Form("{{"),
    delimiter_end: str = Form("}}")
):
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
    image_paths = maximize_fidelity_preview(file_path, data_dict, PREVIEW_DIR, delimiter_start, delimiter_end)
    
    # Convert absolute paths to URLs
    image_urls = [f"/previews/{Path(p).name}" for p in image_paths]
    
    return {"images": image_urls}

@app.post("/api/export")
async def export_document(
    file_id: str = Form(...), 
    filename: str = Form(...), 
    data: str = Form(...), 
    format: str = Form(...),
    delimiter_start: str = Form("{{"),
    delimiter_end: str = Form("}}")
):
    import json
    from jinja2 import Environment
    from fastapi.responses import FileResponse
    try:
        data_dict = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data")

    file_path = UPLOAD_DIR / f"{file_id}_{filename}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    # Use custom env for export too
    doc = DocxTemplate(file_path)
    env = Environment(variable_start_string=delimiter_start, variable_end_string=delimiter_end)
    doc.render(data_dict, jinja_env=env)
    
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
