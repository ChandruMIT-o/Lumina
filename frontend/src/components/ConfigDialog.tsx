import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Select, MenuItem, FormControl, InputLabel, 
  Box, Typography, Stack
} from '@mui/material';
import type { VariableConfig, VariableType } from '../types';

interface ConfigDialogProps {
  open: boolean;
  variables: string[];
  configs: Record<string, VariableConfig>;
  onSave: (configs: Record<string, VariableConfig>) => void;
  onClose: () => void;
}

const VARIABLE_TYPES: VariableType[] = ['text', 'email', 'date', 'number', 'select'];

export const ConfigDialog: React.FC<ConfigDialogProps> = ({ open, variables, configs, onSave, onClose }) => {
  const [localConfigs, setLocalConfigs] = useState<Record<string, VariableConfig>>({});

  useEffect(() => {
    if (open) {
      // Initialize missing configs
      const newConfigs = { ...configs };
      variables.forEach(v => {
        if (!newConfigs[v]) {
          newConfigs[v] = { key: v, type: 'text', label: v.replace(/_/g, ' '), required: true };
        }
      });
      setLocalConfigs(newConfigs);
    }
  }, [open, variables, configs]);

  const handleChange = (key: string, field: keyof VariableConfig, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleSave = () => {
    onSave(localConfigs);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configure Variables</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {variables.length === 0 && <Typography color="text.secondary">No variables found.</Typography>}
          {variables.map(key => {
            const config = localConfigs[key] || { key, type: 'text', label: key };
            return (
              <Box key={key} sx={{ p: 2, border: '1px solid #333', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontFamily: 'monospace' }}>
                  {key}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <TextField 
                      label="Label" 
                      fullWidth 
                      value={config.label} 
                      onChange={(e) => handleChange(key, 'label', e.target.value)} 
                      size="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={config.type}
                        label="Type"
                        onChange={(e) => handleChange(key, 'type', e.target.value)}
                      >
                        {VARIABLE_TYPES.map(t => (
                          <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {config.type === 'select' && (
                    <Box sx={{ flex: 1 }}>
                      <TextField 
                        label="Options (comma separated)" 
                        fullWidth 
                        value={Array.isArray(config.options) ? config.options.join(',') : ''} 
                        onChange={(e) => handleChange(key, 'options', e.target.value.split(','))} 
                        size="small"
                        placeholder="Option 1, Option 2"
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save Configuration</Button>
      </DialogActions>
    </Dialog>
  );
};
