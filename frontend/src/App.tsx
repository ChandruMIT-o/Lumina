import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { theme } from './theme';
import { Sidebar } from './components/Sidebar';
import { UploadZone } from './components/UploadZone';
import { Preview } from './components/Preview';
import { uploadTemplate, getPreview, exportDocument } from './api';
import DescriptionIcon from '@mui/icons-material/Description';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePreviewData = async (fId: string, fName: string, vals: Record<string, string>) => {
      try {
        setLoading(true);
        const data = await getPreview(fId, fName, vals);
        setPreviewImages(data.images.map(url => `http://localhost:8000${url}`));
      } catch (error) {
        console.error(error);
        alert('Error generating preview');
      } finally {
        setLoading(false);
      }
  };

  const handleUpload = async (file: File) => {
    try {
      setLoading(true);
      const data = await uploadTemplate(file);
      setFileId(data.file_id);
      setFilename(data.filename);
      setVariables(data.variables);
      
      const initialValues: Record<string, string> = {};
      data.variables.forEach(v => initialValues[v] = `[${v}]`);
      setValues(initialValues);
      
      // Auto-generate preview
      await generatePreviewData(data.file_id, data.filename, initialValues);
      
    } catch (error) {
      console.error(error);
      alert('Error uploading file');
      setLoading(false); // Ensure loading is off on error
    }
    // Loading set to false in generatePreviewData finally block
  };

  const handleGenerate = async (format: 'preview' | 'docx' | 'pdf' = 'preview') => {
    if (!fileId || !filename) return;

    if (format === 'preview') {
        generatePreviewData(fileId, filename, values);
    } else {
        try {
            setLoading(true);
            const blob = await exportDocument(fileId, filename, values, format);
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename.replace('.docx', '')}_filled.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error(error);
            alert('Error exporting document');
        } finally {
            setLoading(false);
        }
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(30, 31, 32, 0.8)', backdropFilter: 'blur(8px)' }}>
          <Toolbar>
            <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Lumina
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ display: 'flex', flexGrow: 1, mt: 8 }}>
          {fileId ? (
              <>
                <Sidebar 
                    variables={variables} 
                    values={values} 
                    onChange={handleVariableChange} 
                    onGenerate={handleGenerate}
                    loading={loading}
                />
                <Box component="main" sx={{ flexGrow: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
                    <Preview images={previewImages} loading={loading} />
                </Box>
              </>
          ) : (
                <Box component="main" sx={{ flexGrow: 1, height: 'calc(100vh - 64px)' }}>
                    <UploadZone onFileSelect={handleUpload} />
                </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
