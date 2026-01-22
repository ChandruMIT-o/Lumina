import React from 'react';
import { Box, Paper, CircularProgress, Typography } from '@mui/material';

interface PreviewProps {
  images: string[];
  loading: boolean;
}

export const Preview: React.FC<PreviewProps> = ({ images, loading }) => {
  if (loading && images.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (images.length === 0) {
      return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
              <Typography>Preview will appear here</Typography>
          </Box>
      )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 4, bgcolor: '#131314' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', maxWidth: 900, mx: 'auto' }}>
        {images.map((src, index) => (
          <Paper 
            key={index} 
            elevation={4}
            sx={{ 
                overflow: 'hidden',
                lineHeight: 0, 
                transition: 'opacity 0.3s',
                opacity: loading ? 0.5 : 1
            }}
          >
            <img 
                src={src} 
                alt={`Page ${index + 1}`} 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
