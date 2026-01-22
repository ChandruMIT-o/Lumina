import React from 'react';
import { Box, TextField, Typography, Button, Divider, Drawer, MenuItem, IconButton, Tooltip } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { VariableConfig } from '../types';

const DRAWER_WIDTH = 320;

interface SidebarProps {
  variables: string[];
  values: Record<string, string>;
  configs: Record<string, VariableConfig>;
  onChange: (key: string, value: string) => void;
  onGenerate: (format?: 'preview' | 'docx' | 'pdf') => void;
  onOpenConfig: () => void;
  onReset: () => void;
  loading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ variables, values, configs, onChange, onGenerate, onOpenConfig, onReset, loading }) => {
  const renderInput = (key: string) => {
    const config = configs[key] || { key, type: 'text', label: key };
    const value = values[key] || '';

    switch (config.type) {
      case 'select':
        return (
          <TextField
            key={key}
            select
            label={config.label}
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
            fullWidth
            size="small"
          >
            {(config.options || []).map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        );
      case 'date':
        return (
          <TextField
             key={key}
             type="date"
             label={config.label}
             InputLabelProps={{ shrink: true }}
             value={value}
             onChange={(e) => onChange(key, e.target.value)}
             fullWidth
             size="small"
          />
        );
      case 'number':
          return (
            <TextField
                key={key}
                type="number"
                label={config.label}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                fullWidth
                size="small"
            />
          );
      case 'email':
          return (
            <TextField
                key={key}
                type="email"
                label={config.label}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                fullWidth
                size="small"
                error={value.length > 0 && !/\S+@\S+\.\S+/.test(value)}
                helperText={value.length > 0 && !/\S+@\S+\.\S+/.test(value) ? "Invalid email" : ""}
            />
          );
      default:
        return (
          <TextField
            key={key}
            label={config.label}
            variant="outlined"
            fullWidth
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
            size="small"
          />
        );
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', mt: 8, height: 'calc(100% - 64px)' },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Upload New File">
                <IconButton onClick={onReset} size="small" edge="start">
                    <ArrowBackIcon />
                </IconButton>
            </Tooltip>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixHighIcon /> Variables
            </Typography>
        </Box>
        <Tooltip title="Configure Variables">
            <IconButton onClick={onOpenConfig} size="small">
                <SettingsIcon />
            </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <Box sx={{ overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
        {variables.length === 0 ? (
           <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
               No variables found or no document loaded.
           </Typography>
        ) : (
            variables.map((variable) => renderInput(variable))
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
