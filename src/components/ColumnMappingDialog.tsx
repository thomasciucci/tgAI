import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Box, Typography
} from '@mui/material';

interface ColumnMappingDialogProps {
  open: boolean;
  columns: string[];
  tabName?: string;
  currentTabIndex?: number;
  totalTabs?: number;
  isGroupedMapping?: boolean;
  allTabNames?: string[];
  onConfirm: (mapping: { animalIdColumn: string; timeColumn: string; parameterColumns: string[] }) => void;
  onClose: () => void;
}

const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({ 
  open, 
  columns, 
  tabName, 
  currentTabIndex, 
  totalTabs, 
  isGroupedMapping = false,
  allTabNames = [],
  onConfirm, 
  onClose 
}) => {
  const [animalIdColumn, setAnimalIdColumn] = useState('');
  const [timeColumn, setTimeColumn] = useState('');
  const [parameterColumns, setParameterColumns] = useState<string[]>([]);

  React.useEffect(() => {
    if (open && columns.length > 0) {
      setAnimalIdColumn(columns.find(c => /animal.?id/i.test(c)) || columns[0]);
      setTimeColumn(columns.find(c => /day|date|time/i.test(c)) || columns[0]);
      setParameterColumns([]);
    }
  }, [open, columns]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #2D1B3D 0%, #8A0051 100%)',
        color: 'white',
        textAlign: 'center',
        py: 3
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Step 2: Configure Data Import
          </Typography>
          {isGroupedMapping ? (
            <Box>
              <Typography variant="body1" sx={{ color: '#E699C2', fontWeight: 500, mb: 1 }}>
                🎉 All {totalTabs} tabs have identical headers! 
              </Typography>
              <Typography variant="body2" sx={{ color: '#E699C2' }}>
                Configure once for: {allTabNames.join(', ')}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ color: '#E699C2', fontWeight: 500 }}>
              {totalTabs && totalTabs > 1 
                ? `Configure data mapping for "${tabName}" (${currentTabIndex || 1} of ${totalTabs})`
                : `Configure mapping for "${tabName || 'Unknown'}"`
              }
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {isGroupedMapping && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#F9ECEF', borderRadius: 2, border: '1px solid #EFCCDB' }}>
            <Typography variant="body2" sx={{ color: '#8A0051', fontWeight: 500 }}>
              💡 <strong>Smart Import:</strong> Since all your selected tabs have the same column structure, 
              you only need to configure the mapping once. It will be applied to all {totalTabs} tabs automatically.
            </Typography>
          </Box>
        )}
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051' }}>
            🐭 Which column contains the <b>Animal ID</b>?
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="animal-id-column-label">Animal ID Column</InputLabel>
            <Select
              labelId="animal-id-column-label"
              value={animalIdColumn}
              label="Animal ID Column"
              onChange={e => setAnimalIdColumn(e.target.value)}
            >
              {columns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051' }}>
            📅 Which column contains the <b>timepoint</b> (study day or date)?
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="time-column-label">Time Column</InputLabel>
            <Select
              labelId="time-column-label"
              value={timeColumn}
              label="Time Column"
              onChange={e => setTimeColumn(e.target.value)}
            >
              {columns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051' }}>
            📊 Which columns contain <b>data to import</b> (tumor volume, weight, etc.)?
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="param-columns-label">Parameters</InputLabel>
            <Select
              labelId="param-columns-label"
              multiple
              value={parameterColumns}
              onChange={e => {
                const value = e.target.value;
                setParameterColumns(typeof value === 'string' ? value.split(',') : value);
              }}
              input={<OutlinedInput label="Parameters" />}
              renderValue={selected => (selected as string[]).join(', ')}
            >
              {columns.map(col => (
                <MenuItem key={col} value={col}>
                  <Checkbox checked={parameterColumns.indexOf(col) > -1} />
                  <ListItemText primary={col} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>
          Cancel Import
        </Button>
        <Button
          onClick={() => onConfirm({ animalIdColumn, timeColumn, parameterColumns })}
          disabled={!animalIdColumn || !timeColumn || parameterColumns.length === 0}
          variant="contained"
          sx={{ px: 3 }}
        >
          {isGroupedMapping 
            ? `Apply to All ${totalTabs} Tabs ✓`
            : (totalTabs && totalTabs > 1 && currentTabIndex && currentTabIndex < totalTabs
                ? `Next Tab (${currentTabIndex + 1}/${totalTabs}) →` 
                : 'Complete Import ✓')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnMappingDialog; 