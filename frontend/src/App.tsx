import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { theme } from './theme';
import { Sidebar } from './components/Sidebar';
import { UploadZone } from './components/UploadZone';
import { Preview } from './components/Preview';
import { ConfigDialog } from './components/ConfigDialog';
import { uploadTemplate, getPreview, exportDocument } from './api';
import DescriptionIcon from '@mui/icons-material/Description';
import type { VariableConfig } from './types';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // v2 States
  const [configs, setConfigs] = useState<Record<string, VariableConfig>>({});
  const [delimiters, setDelimiters] = useState({ start: '{{', end: '}}' });
  const [configOpen, setConfigOpen] = useState(false);

  const generatePreviewData = useCallback(async (fId: string, fName: string, vals: Record<string, string>, delims: { start: string; end: string }) => {
      try {
        setLoading(true);
        const data = await getPreview(fId, fName, vals, delims);
        setPreviewImages(data.images.map(url => `http://localhost:8000${url}`));
      } catch (error) {
        console.error(error);
        // alert('Error generating preview'); // Suppress alert for auto-generation to avoid spam
      } finally {
        setLoading(false);
      }
  }, []);

  // Debounced Auto-Preview
  useEffect(() => {
      if (!fileId || !filename) return;
      
      const timer = setTimeout(() => {
          generatePreviewData(fileId, filename, values, delimiters);
      }, 800); // 800ms debounce

      return () => clearTimeout(timer);
  }, [values, fileId, filename, delimiters, generatePreviewData]);

  const handleUpload = async (file: File, uploadDelimiters: { start: string; end: string }) => {
    try {
      setLoading(true);
      setDelimiters(uploadDelimiters);
      
      const data = await uploadTemplate(file, uploadDelimiters);
      setFileId(data.file_id);
      setFilename(data.filename);
      
      // Map rich schema from backend to config state
      const newConfigs: Record<string, VariableConfig> = {};
      const newVariables: string[] = [];
      const initialValues: Record<string, string> = {};

      data.variables.forEach((v: VariableConfig) => {
          newVariables.push(v.key);
          newConfigs[v.key] = v;
          initialValues[v.key] = `[${v.key}]`;
      });
      
      setVariables(newVariables);
      setConfigs(newConfigs);
      setValues(initialValues);
      
      // Automatically open config if it seems necessary (optional strategy),
      // for now let's keep it closed if semantics were found, open if not?
      // User said "Auto-populate ConfigDialog", so we populate it.
      // If semantic variables found, maybe we don't need to open it immediately?
      // Let's open it so they can verify.
      setConfigOpen(true);
      
      // Initial preview
      await generatePreviewData(data.file_id, data.filename, initialValues, uploadDelimiters);
      
    } catch (error) {
      console.error(error);
      alert('Error uploading file');
      setLoading(false); 
    }
  };

  const reset = () => {
      setFileId(null);
      setFilename(null);
      setVariables([]);
      setConfigs({});
      setValues({});
      setPreviewImages([]);
  };

  const handleGenerate = async (format: 'preview' | 'docx' | 'pdf' = 'preview') => {
    if (!fileId || !filename) return;

    if (format === 'preview') {
        generatePreviewData(fileId, filename, values, delimiters);
    } else {
        try {
            setLoading(true);
            const blob = await exportDocument(fileId, filename, values, format, delimiters);
            
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
              Lumina v3
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ display: 'flex', flexGrow: 1, mt: 8 }}>
          {fileId ? (
              <>
                <Sidebar 
                    variables={variables} 
                    values={values}
                    configs={configs}
                    onChange={handleVariableChange} 
                    onGenerate={handleGenerate}
                    onOpenConfig={() => setConfigOpen(true)}
                    onReset={reset}
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
        
        <ConfigDialog 
            open={configOpen}
            variables={variables}
            configs={configs}
            onSave={setConfigs}
            onClose={() => setConfigOpen(false)}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
