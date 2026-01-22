import re
from pathlib import Path
from docxtpl import DocxTemplate
from docx2pdf import convert
from pdf2image import convert_from_path
import pythoncom
import os
import uuid

from jinja2 import Environment

def parse_docx_variables(file_path: Path, delimiter_start: str = '{{', delimiter_end: str = '}}'):
    """
    Extracts variable names from a docx file.
    Supports custom delimiters.
    """
    doc = DocxTemplate(file_path)
    
    # Create a custom jinja environment with the specified delimiters
    env = Environment(variable_start_string=delimiter_start, variable_end_string=delimiter_end)
    
    # Use docxtpl's helper but with our custom env
    # This avoids manual XML parsing which caused crashes
    return list(doc.get_undeclared_template_variables(jinja_env=env))

def maximize_fidelity_preview(template_path: Path, context: dict, output_dir: Path, delimiter_start: str = '{{', delimiter_end: str = '}}'):
    """
    1. Render docx with context.
    2. Save temporary docx.
    3. Convert to PDF using docx2pdf (uses MS Word).
    4. Convert PDF to images using pdf2image (uses Poppler).
    """
    doc = DocxTemplate(template_path)
    
    # Create env with custom delimiters
    env = Environment(variable_start_string=delimiter_start, variable_end_string=delimiter_end)
    doc.render(context, jinja_env=env)
    
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

def process_semantic_variables(file_path: Path, delimiter_start: str = '{{', delimiter_end: str = '}}'):
    """
    Parses the DOCX for semantic variables (e.g. {{ var #type#* }}),
    extracts the metadata, and creates a "clean" version of the DOCX
    ready for rendering (with just {{ var }}).
    
    Returns:
    {
        "variables": [
             {"key": "var", "type": "email", "required": true, "label": "Var"}
        ],
        "clean_path": Path(...)
    }
    """
    print(f"Processing semantic vars for {file_path}")
    try:
        doc = DocxTemplate(file_path)
        xml_content = doc.get_xml()
        
        # Escape delimiters for regex
        d_start = re.escape(delimiter_start)
        d_end = re.escape(delimiter_end)
        
        pattern = re.compile(
            f"{d_start}\\s*([\\w_]+)\\s*(?:#([\\w]+)#)?(\\*?)\\s*{d_end}"
        )
        
        extracted_configs = {}
        
        def replacer(match):
            key = match.group(1)
            var_type = match.group(2) if match.group(2) else "text"
            is_required = bool(match.group(3))
            
            if key not in extracted_configs:
                 extracted_configs[key] = {
                     "key": key,
                     "type": var_type,
                     "required": is_required,
                     "label": key.replace("_", " ").title()
                 }
            else:
                if is_required:
                    extracted_configs[key]["required"] = True
                if var_type != 'text':
                     extracted_configs[key]["type"] = var_type

            return f"{delimiter_start} {key} {delimiter_end}"

        clean_xml = pattern.sub(replacer, xml_content)
        
        if extracted_configs:
            doc.patch_xml(clean_xml)
        
        clean_filename = f"clean_{file_path.name}"
        clean_path = file_path.parent / clean_filename
        doc.save(clean_path)
        
        return {
            "variables": list(extracted_configs.values()),
            "clean_path": clean_path
        }
    except Exception as e:
        print(f"Error processing semantic variables: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback: Just return basic variables without type info, and original path
        try:
            basic_vars = parse_docx_variables(file_path, delimiter_start, delimiter_end)
            basic_configs = [{"key": v, "type": "text", "required": True, "label": v} for v in basic_vars]
            return {
                "variables": basic_configs,
                "clean_path": file_path
            }
        except Exception as e2:
             print(f"Fallback extraction also failed: {e2}")
             # Absolute worst case: return nothing, let user add manually
             return {
                 "variables": [],
                 "clean_path": file_path
             }
