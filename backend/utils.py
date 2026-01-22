import re
from pathlib import Path
from docxtpl import DocxTemplate
from docx2pdf import convert
from pdf2image import convert_from_path
import pythoncom
import os
import uuid

def parse_docx_variables(file_path: Path):
    """
    Extracts variable names from a docx file.
    Assumes variables are in the format {{ variable_name }}
    """
    doc = DocxTemplate(file_path)
    # Use docxtpl's jinja environment to find undeclared variables
    # This is much more robust than regex on text content
    return list(doc.get_undeclared_template_variables())

def maximize_fidelity_preview(template_path: Path, context: dict, output_dir: Path):
    """
    1. Render docx with context.
    2. Save temporary docx.
    3. Convert to PDF using docx2pdf (uses MS Word).
    4. Convert PDF to images using pdf2image (uses Poppler).
    """
    doc = DocxTemplate(template_path)
    doc.render(context)
    
    temp_id = str(uuid.uuid4())
    temp_docx = output_dir / f"temp_{temp_id}.docx"
    temp_pdf = output_dir / f"temp_{temp_id}.pdf"
    
    doc.save(temp_docx)
    
    # Ensure COM is initialized for thread safety if this runs in a thread
    pythoncom.CoInitialize()
    
    try:
        # Convert to PDF
        # Note: input and output for docx2pdf should be absolute paths usually for safety
        convert(str(temp_docx), str(temp_pdf))
        
        # Convert PDF to images
        # Poppler needs to be in PATH or specified. 
        # Assuming user might need instructions if poppler is missing.
        # Check if we can fallback or if we just assume it's there. 
        # Windows users often don't have poppler installed by default.
        # We will wrap this in a try/except.
        
        images = convert_from_path(str(temp_pdf))
        
        image_paths = []
        for i, image in enumerate(images):
            image_name = f"preview_{temp_id}_{i}.png"
            image_path = output_dir / image_name
            image.save(image_path, "PNG")
            image_paths.append(str(image_path))
            
        return image_paths
        
    except Exception as e:
        print(f"Error in preview generation: {e}")
        # Fallback? Or re-raise?
        # For now, let's re-raise so we see the error
        raise e
    finally:
        # Cleanup temp files
        if temp_docx.exists():
            os.remove(temp_docx)
        if temp_pdf.exists():
            os.remove(temp_pdf)

