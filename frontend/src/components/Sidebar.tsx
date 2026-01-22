import React from 'react';
import { Box, TextField, Typography, Button, Divider, Drawer } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const DRAWER_WIDTH = 320;

interface SidebarProps {
  variables: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onGenerate: (format?: 'preview' | 'docx' | 'pdf') => void;
  loading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ variables, values, onChange, onGenerate, loading }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', mt: 8, height: 'calc(100% - 64px)' },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHighIcon /> Variables
        </Typography>
        <Typography variant="caption" color="text.secondary" paragraph>
          Fill in the fields below to update the document.
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {variables.length === 0 ? (
           <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
               No variables found or no document loaded.
           </Typography>
        ) : (
            variables.map((variable) => (
            <TextField
                key={variable}
                label={variable}
                variant="outlined"
                fullWidth
                value={values[variable] || ''}
                onChange={(e) => onChange(variable, e.target.value)}
                size="small"
            />
            ))
        )}
      </Box>
      <Box sx={{ p: 2, mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button 
            variant="contained" 
            fullWidth 
            onClick={() => onGenerate('preview')}
            disabled={loading}
        >
            {loading ? 'Generating Preview...' : 'Update Preview'}
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => onGenerate('docx')}
                disabled={loading}
            >
                Export DOCX
            </Button>
            <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => onGenerate('pdf')}
                disabled={loading}
            >
                Export PDF
            </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
