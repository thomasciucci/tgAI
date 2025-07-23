import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { colorManager } from '../utils/ColorManager';

interface ColorEditorProps {
  availableGroups: string[];
  onColorsChanged: () => void;
}

const ColorEditor: React.FC<ColorEditorProps> = ({ availableGroups, onColorsChanged }) => {
  const [open, setOpen] = useState(false);
  const [tempColors, setTempColors] = useState<Map<string, string>>(new Map());

  const handleOpen = () => {
    // Initialize temp colors with current colors
    const currentColors = new Map();
    availableGroups.forEach(group => {
      currentColors.set(group, colorManager.getColor(group));
    });
    setTempColors(currentColors);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    // Apply temp colors to color manager
    tempColors.forEach((color, group) => {
      colorManager.setColor(group, color);
    });
    onColorsChanged();
    setOpen(false);
  };

  const handleColorChange = (group: string, color: string) => {
    const newColors = new Map(tempColors);
    newColors.set(group, color);
    setTempColors(newColors);
  };

  const availableColors = colorManager.getAvailableColors();

  return (
    <>
      <Tooltip title="Edit Group Colors">
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{ 
            color: '#8A0051',
            '&:hover': { bgcolor: '#F9ECEF' }
          }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #2D1B3D 0%, #8A0051 100%)',
          color: 'white',
          textAlign: 'center',
          py: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            🎨 Customize Group Colors
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            Select colors for each group. These colors will be used consistently across all visualizations.
          </Typography>
          
          {availableGroups.map(group => (
            <Box key={group} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#8A0051', fontWeight: 600 }}>
                {group}
              </Typography>
              <Grid container spacing={1}>
                {availableColors.map(color => (
                  <Grid item key={color}>
                    <Paper
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: tempColors.get(group) === color ? '3px solid #8A0051' : '1px solid #ddd',
                        borderRadius: 1,
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s'
                        }
                      }}
                      onClick={() => handleColorChange(group, color)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ px: 3 }}>
            Apply Colors
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ColorEditor;