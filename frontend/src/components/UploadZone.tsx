import React, { useState } from 'react';
import { Box, Typography, Paper, Button, TextField, Collapse, Link } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onFileSelect: (file: File, delimiters: { start: string; end: string }) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const [delimiters, setDelimiters] = useState({ start: '{{', end: '}}' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0], delimiters);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onFileSelect(e.target.files[0], delimiters);
      }
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          border: '2px dashed #5f6368',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#8ab4f8',
            backgroundColor: 'rgba(138, 180, 248, 0.04)',
          },
          maxWidth: 600,
          width: '100%'
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: '#8ab4f8' }} />
        <Typography variant="h5">Upload Document Template</Typography>
        <Typography variant="body2" color="text.secondary">
          Drag & drop your .docx file here or
        </Typography>
        <Button variant="contained" component="label">
          Browse Files
          <input type="file" hidden accept=".docx" onChange={handleChange} />
        </Button>

        <Box sx={{ mt: 2, width: '100%' }}>
            <Typography variant="body2" align="center">
                <Link 
                    component="button" 
                    variant="body2" 
                    onClick={(e) => { e.stopPropagation(); setShowAdvanced(!showAdvanced); }}
                >
                    {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                </Link>
            </Typography>
            <Collapse in={showAdvanced}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }} onClick={(e) => e.stopPropagation()}>
                    <TextField 
                        label="Start Delimiter" 
                        size="small" 
                        value={delimiters.start}
                        onChange={(e) => setDelimiters(prev => ({ ...prev, start: e.target.value }))}
                        fullWidth
                    />
                    <TextField 
                        label="End Delimiter" 
                        size="small" 
                        value={delimiters.end}
                        onChange={(e) => setDelimiters(prev => ({ ...prev, end: e.target.value }))}
                        fullWidth
                    />
                </Box>
            </Collapse>
        </Box>
      </Paper>
    </Box>
  );
};
