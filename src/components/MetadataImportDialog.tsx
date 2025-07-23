import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem, 
  Checkbox, ListItemText, OutlinedInput, Box, Typography,
  Step, Stepper, StepLabel, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';

interface MetadataImportDialogProps {
  open: boolean;
  allTabs: { tabName: string; columns: string[]; rows: any[] }[];
  onConfirm: (metadata: { sourceTab: string; animalIdColumn: string; metadataColumns: string[]; mappingPreview: any[] }) => void;
  onClose: () => void;
}

const MetadataImportDialog: React.FC<MetadataImportDialogProps> = ({ 
  open, 
  allTabs, 
  onConfirm, 
  onClose 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTab, setSelectedTab] = useState('');
  const [animalIdColumn, setAnimalIdColumn] = useState('');
  const [metadataColumns, setMetadataColumns] = useState<string[]>([]);

  const steps = ['Select Source Tab', 'Map Animal ID', 'Choose Metadata Fields', 'Preview & Confirm'];

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setActiveStep(0);
      setSelectedTab('');
      setAnimalIdColumn('');
      setMetadataColumns([]);
    }
  }, [open]);

  const selectedTabData = allTabs.find(tab => tab.tabName === selectedTab);
  const availableColumns = selectedTabData?.columns || [];

  // Generate preview of metadata mapping
  const generatePreview = () => {
    if (!selectedTabData || !animalIdColumn || metadataColumns.length === 0) return [];
    
    return selectedTabData.rows.slice(0, 5).map(row => {
      const preview: any = { animalId: row[animalIdColumn] };
      metadataColumns.forEach(col => {
        preview[col] = row[col];
      });
      return preview;
    });
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleConfirm = () => {
    const preview = generatePreview();
    onConfirm({
      sourceTab: selectedTab,
      animalIdColumn,
      metadataColumns,
      mappingPreview: preview
    });
    onClose();
  };

  const canProceedToNext = () => {
    switch (activeStep) {
      case 0: return selectedTab !== '';
      case 1: return animalIdColumn !== '';
      case 2: return metadataColumns.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051', mb: 3 }}>
              🗂️ Which tab contains your <b>animal metadata</b> (groups, treatments, status, etc.)?
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Source Tab</InputLabel>
              <Select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
                label="Source Tab"
              >
                {allTabs.map((tab) => (
                  <MenuItem key={tab.tabName} value={tab.tabName}>
                    {tab.tabName} ({tab.rows.length} rows, {tab.columns.length} columns)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051', mb: 3 }}>
              🐭 Which column in <b>"{selectedTab}"</b> contains the Animal IDs?
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Animal ID Column</InputLabel>
              <Select
                value={animalIdColumn}
                onChange={(e) => setAnimalIdColumn(e.target.value)}
                label="Animal ID Column"
              >
                {availableColumns.map((col) => (
                  <MenuItem key={col} value={col}>
                    {col}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051', mb: 3 }}>
              📊 Select which metadata fields to import:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
              Common metadata: Group, Treatment, Sex, Strain, Status, Dose, etc.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Metadata Fields</InputLabel>
              <Select
                multiple
                value={metadataColumns}
                onChange={(e) => {
                  const value = e.target.value;
                  setMetadataColumns(typeof value === 'string' ? value.split(',') : value);
                }}
                input={<OutlinedInput label="Metadata Fields" />}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {availableColumns
                  .filter(col => col !== animalIdColumn) // Exclude animal ID column
                  .map((col) => (
                    <MenuItem key={col} value={col}>
                      <Checkbox checked={metadataColumns.indexOf(col) > -1} />
                      <ListItemText primary={col} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 3: {
        const preview = generatePreview();
        return (
          <Box>
            <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051', mb: 2 }}>
              ✅ Preview of metadata mapping:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Source: <b>{selectedTab}</b> → Animal ID: <b>{animalIdColumn}</b> → Fields: <b>{metadataColumns.join(', ')}</b>
            </Typography>
            
            {preview.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Animal ID</TableCell>
                      {metadataColumns.map(col => (
                        <TableCell key={col} sx={{ fontWeight: 600 }}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.animalId}</TableCell>
                        {metadataColumns.map(col => (
                          <TableCell key={col}>{row[col] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
              Showing first 5 rows. This metadata will be added to all matching animals in your study data.
            </Typography>
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #2D1B3D 0%, #8A0051 100%)',
        color: 'white',
        textAlign: 'center',
        py: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          📋 Import Animal Metadata
        </Typography>
        <Typography variant="body2" sx={{ color: '#E699C2', mt: 1 }}>
          Add group, treatment, and other animal information for data stratification
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} sx={{ mr: 1 }}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button 
            onClick={handleNext} 
            variant="contained" 
            disabled={!canProceedToNext()}
            sx={{ px: 3 }}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            disabled={!canProceedToNext()}
            sx={{ px: 3 }}
          >
            Import Metadata
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MetadataImportDialog;