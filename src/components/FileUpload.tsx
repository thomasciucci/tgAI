import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, Checkbox, ListItemText, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

export type ParsedData = Record<string, any>[];

interface FileUploadProps {
  onTabsParsed: (tabs: { tabName: string; columns: string[]; rows: ParsedData; currentTabNumber?: number; totalTabs?: number; currentUINumber?: number; totalUIs?: number; isGroupedMapping?: boolean }[]) => void;
  onAllTabsParsed?: (allTabs: { tabName: string; columns: string[]; rows: ParsedData }[]) => void;
}

// Global function to continue processing from App.tsx
let continueNextSheetProcessing: (() => void) | null = null;

export const triggerNextSheetProcessing = () => {
  if (continueNextSheetProcessing) {
    continueNextSheetProcessing();
  }
};

const HEADER_KEYWORDS = [
  'group', 'animal', 'volume', 'weight', 'comment', 'observations', 'sex', 'date'
];

const MAX_HEADER_SCAN_ROWS = 10;

// Helper function to check if two header arrays are identical
const areHeadersIdentical = (headers1: string[], headers2: string[]): boolean => {
  if (headers1.length !== headers2.length) return false;
  return headers1.every((header, index) => header === headers2[index]);
};

// Helper function to group tabs by identical headers
const groupTabsByHeaders = (tabs: { tabName: string; columns: string[]; rows: ParsedData }[]): { tabs: { tabName: string; columns: string[]; rows: ParsedData }[]; hasIdenticalHeaders: boolean }[] => {
  const groups: { tabs: { tabName: string; columns: string[]; rows: ParsedData }[]; hasIdenticalHeaders: boolean }[] = [];
  
  tabs.forEach(tab => {
    // Find existing group with identical headers
    const existingGroup = groups.find(group => 
      group.tabs.length > 0 && areHeadersIdentical(group.tabs[0].columns, tab.columns)
    );
    
    if (existingGroup) {
      existingGroup.tabs.push(tab);
      existingGroup.hasIdenticalHeaders = true;
    } else {
      groups.push({ tabs: [tab], hasIdenticalHeaders: false });
    }
  });
  
  // After all tabs are processed, update hasIdenticalHeaders flag correctly
  groups.forEach(group => {
    group.hasIdenticalHeaders = group.tabs.length > 1;
  });
  
  console.log('Final groups after processing:', groups.map(g => ({ 
    count: g.tabs.length, 
    hasIdentical: g.hasIdenticalHeaders, 
    names: g.tabs.map(t => t.tabName),
    headers: g.tabs[0].columns 
  })));
  
  // Debug: Show detailed headers for each tab
  console.log('=== DETAILED HEADER COMPARISON ===');
  tabs.forEach((tab, index) => {
    console.log(`Tab ${index + 1} "${tab.tabName}" headers:`, tab.columns);
  });
  
  if (tabs.length === 2) {
    console.log('Headers match?', areHeadersIdentical(tabs[0].columns, tabs[1].columns));
    console.log('Tab 1 header count:', tabs[0].columns.length);
    console.log('Tab 2 header count:', tabs[1].columns.length);
    
    // Show differences
    const diff1 = tabs[0].columns.filter(h => !tabs[1].columns.includes(h));
    const diff2 = tabs[1].columns.filter(h => !tabs[0].columns.includes(h));
    if (diff1.length > 0) console.log('Headers only in Tab 1:', diff1);
    if (diff2.length > 0) console.log('Headers only in Tab 2:', diff2);
  }
  
  return groups;
};

const FileUpload: React.FC<FileUploadProps> = ({ onTabsParsed, onAllTabsParsed }) => {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [originalSelectedSheets, setOriginalSelectedSheets] = useState<string[]>([]); // Track original selection for progress
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [csvData, setCsvData] = useState<ParsedData | null>(null);
  // For header preview/confirmation
  const [headerPreview, setHeaderPreview] = useState<{ 
    tabName: string; 
    currentTabNumber: number;
    totalTabs: number;
    currentUINumber: number;
    totalUIs: number;
    headerRow: any[]; 
    dataRows: any[][]; 
    allRows: any[][]; 
    onConfirm: (headerRow: any[], dataRows: any[][]) => void 
  } | null>(null);
  // Trigger to continue processing next sheet
  const [shouldContinueProcessing, setShouldContinueProcessing] = useState(false);
  // Track all groups and current group being processed
  const [allHeaderGroups, setAllHeaderGroups] = useState<any[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Process a group of tabs (either with identical headers or individual)
  const processHeaderGroup = React.useCallback((group: { tabs: { tabName: string; columns: string[]; rows: ParsedData; headerRow?: any[]; dataRows?: any[][]; allRows?: any[][] }[]; hasIdenticalHeaders: boolean }, groupIndex: number, totalGroups: number) => {
    const firstTab = group.tabs[0];
    
    if (group.hasIdenticalHeaders && group.tabs.length > 1) {
      console.log(`Processing group with ${group.tabs.length} tabs with identical headers`);
      
      // Show single header preview for the group
      setHeaderPreview({
        tabName: `${group.tabs.length} tabs: ${group.tabs.map(t => t.tabName).join(', ')}`,
        currentTabNumber: 1,
        totalTabs: 1,
        currentUINumber: 1,
        totalUIs: 1,
        headerRow: firstTab.headerRow || [],
        dataRows: firstTab.dataRows || [],
        allRows: firstTab.allRows || [],
        onConfirm: (confirmedHeader, confirmedDataRows) => {
          // Apply confirmed header to all tabs in the group
          const processedTabs = group.tabs.map((tab, index) => {
            const confirmedColumns: string[] = [];
            let confirmedEmptyCount = 1;
            confirmedHeader.forEach((h: any) => {
              if (h && String(h).trim() !== '') {
                confirmedColumns.push(String(h));
              } else {
                confirmedColumns.push(`_EMPTY_${confirmedEmptyCount++}`);
              }
            });
            
            return {
              tabName: tab.tabName,
              columns: confirmedColumns,
              rows: tab.rows,
              currentTabNumber: index + 1,
              totalTabs: group.tabs.length,
              currentUINumber: 1,
              totalUIs: 1,
              isGroupedMapping: true
            };
          });
          
          console.log(`Sending ${processedTabs.length} tabs with identical headers for mapping`);
          onTabsParsed(processedTabs);
          setHeaderPreview(null);
        }
      });
    } else {
      console.log(`Processing single tab: ${firstTab.tabName}`);
      
      // Show header preview for single tab
      setHeaderPreview({
        tabName: firstTab.tabName,
        currentTabNumber: 1,
        totalTabs: 1,
        currentUINumber: 1,
        totalUIs: 1,
        headerRow: firstTab.headerRow || [],
        dataRows: firstTab.dataRows || [],
        allRows: firstTab.allRows || [],
        onConfirm: (confirmedHeader, confirmedDataRows) => {
          const confirmedColumns: string[] = [];
          let confirmedEmptyCount = 1;
          confirmedHeader.forEach((h: any) => {
            if (h && String(h).trim() !== '') {
              confirmedColumns.push(String(h));
            } else {
              confirmedColumns.push(`_EMPTY_${confirmedEmptyCount++}`);
            }
          });
          
          console.log(`Sending single tab for mapping: ${firstTab.tabName}`);
          onTabsParsed([{
            tabName: firstTab.tabName,
            columns: confirmedColumns,
            rows: firstTab.rows,
            currentTabNumber: 1,
            totalTabs: 1,
            currentUINumber: 1,
            totalUIs: 1,
            isGroupedMapping: false
          }]);
          setHeaderPreview(null);
        }
      });
    }
  }, [onTabsParsed]);

  // Continue to next group after current group is complete
  const continueToNextGroup = React.useCallback(() => {
    console.log('=== CONTINUING TO NEXT GROUP ===');
    console.log('Current group index:', currentGroupIndex);
    console.log('Total groups:', allHeaderGroups.length);
    
    const nextGroupIndex = currentGroupIndex + 1;
    if (nextGroupIndex < allHeaderGroups.length) {
      console.log(`Processing group ${nextGroupIndex + 1} of ${allHeaderGroups.length}`);
      setCurrentGroupIndex(nextGroupIndex);
      processHeaderGroup(allHeaderGroups[nextGroupIndex], nextGroupIndex, allHeaderGroups.length);
    } else {
      console.log('*** ALL GROUPS PROCESSED ***');
      // Reset state
      setAllHeaderGroups([]);
      setCurrentGroupIndex(0);
    }
  }, [currentGroupIndex, allHeaderGroups, processHeaderGroup]);

  // Function to continue to next sheet after data mapping is complete
  const continueToNextSheet = React.useCallback(() => {
    console.log('Processing complete - checking for next group');
    continueToNextGroup();
  }, [continueToNextGroup]);

  // Set the global function
  React.useEffect(() => {
    continueNextSheetProcessing = continueToNextSheet;
    return () => {
      continueNextSheetProcessing = null;
    };
  }, [continueToNextSheet]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setSheetNames([]);
      setSelectedSheets([]);
      setWorkbook(null);
      Papa.parse(file as any, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          setCsvData(results.data as ParsedData);
          if (results.data && results.data.length > 0) {
            onTabsParsed([
              {
                tabName: 'CSV',
                columns: Object.keys(results.data[0]),
                rows: results.data as ParsedData
              }
            ]);
          }
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setSheetNames(wb.SheetNames);
        setSelectedSheets([wb.SheetNames[0]]);
        setWorkbook(wb);
        setCsvData(null);
      };
      reader.onerror = () => {
        alert('Excel file reading error');
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload a CSV or Excel file.');
    }
  }, [onTabsParsed]);

  // When user toggles sheet selection
  const handleToggle = (sheet: string) => () => {
    let newSelected: string[];
    if (selectedSheets.includes(sheet)) {
      newSelected = selectedSheets.filter(s => s !== sheet);
    } else {
      newSelected = [...selectedSheets, sheet];
    }
    setSelectedSheets(newSelected);
  };

  // Flexible header row detection
  function detectHeaderRow(allRows: any[][]): { headerRow: any[]; dataRows: any[][]; headerIndex: number } {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(MAX_HEADER_SCAN_ROWS, allRows.length); ++i) {
      const row = allRows[i];
      if (!Array.isArray(row)) continue;
      const score = row.reduce((acc, cell) => {
        if (typeof cell === 'string') {
          const cellLower = cell.toLowerCase();
          if (HEADER_KEYWORDS.some(keyword => cellLower.includes(keyword))) {
            return acc + 1;
          }
        }
        return acc;
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const headerRow = allRows[bestIdx] || [];
    const dataRows = allRows.slice(bestIdx + 1);
    return { headerRow, dataRows, headerIndex: bestIdx };
  }

  // Parse all tabs from the Excel file for metadata access
  const parseAllTabs = React.useCallback(() => {
    if (!workbook || !onAllTabsParsed) return;
    
    const allTabsData: { tabName: string; columns: string[]; rows: ParsedData }[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
      
      if (Array.isArray(raw) && raw.length > 0) {
        // Use same header detection logic
        const { headerRow, dataRows } = detectHeaderRow(raw);
        
        const columns: string[] = [];
        let emptyCount = 1;
        headerRow.forEach((h: any) => {
          if (h && String(h).trim() !== '') {
            columns.push(String(h));
          } else {
            columns.push(`_EMPTY_${emptyCount++}`);
          }
        });
        
        const rows = dataRows
          .filter((row) => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && cell !== ''))
          .map((row) =>
            Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]]))
          );
        
        allTabsData.push({
          tabName: sheetName,
          columns,
          rows: rows as ParsedData
        });
      }
    });
    
    onAllTabsParsed(allTabsData);
  }, [workbook, onAllTabsParsed]);

  // When user confirms sheet selection, process all selected sheets at once
  const handleConfirmSheets = () => {
    if (!workbook || selectedSheets.length === 0) return;
    
    console.log('Processing all selected sheets:', selectedSheets);
    
    // Parse all selected sheets first
    const allParsedTabs: { tabName: string; columns: string[]; rows: ParsedData; headerRow: any[]; dataRows: any[][]; allRows: any[][] }[] = [];
    
    selectedSheets.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
      
      if (Array.isArray(raw) && raw.length > 0) {
        // Flexible header detection
        const { headerRow, dataRows } = detectHeaderRow(raw);
        
        const columns: string[] = [];
        let emptyCount = 1;
        headerRow.forEach((h: any) => {
          if (h && String(h).trim() !== '') {
            columns.push(String(h));
          } else {
            columns.push(`_EMPTY_${emptyCount++}`);
          }
        });
        
        const rows = dataRows
          .filter((row) => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && cell !== ''))
          .map((row) =>
            Object.fromEntries(columns.map((col: string, i: number) => [col, row[i]]))
          );
        
        allParsedTabs.push({
          tabName: sheetName,
          columns,
          rows: rows as ParsedData,
          headerRow,
          dataRows,
          allRows: raw
        });
      }
    });
    
    if (allParsedTabs.length === 0) {
      console.log('No valid sheets found');
      return;
    }
    
    // Group tabs by identical headers
    const headerGroups = groupTabsByHeaders(allParsedTabs);
    console.log('Header groups:', headerGroups.map(g => ({ count: g.tabs.length, hasIdentical: g.hasIdenticalHeaders, names: g.tabs.map(t => t.tabName) })));
    
    // Store all groups and start with the first one
    setAllHeaderGroups(headerGroups);
    setCurrentGroupIndex(0);
    
    // Process the first group
    if (headerGroups.length > 0) {
      processHeaderGroup(headerGroups[0], 0, headerGroups.length);
    }
  };

  // Parse all tabs when workbook is loaded
  React.useEffect(() => {
    if (workbook) {
      parseAllTabs();
    }
  }, [workbook, parseAllTabs]);

  // Auto-continue processing when triggered
  React.useEffect(() => {
    if (shouldContinueProcessing) {
      console.log('Continuing processing...');
      setShouldContinueProcessing(false);
    }
  }, [shouldContinueProcessing]);

  // Handler for confirming header preview
  const handleHeaderConfirm = () => {
    if (!headerPreview) return;
    headerPreview.onConfirm(headerPreview.headerRow, headerPreview.dataRows);
  };

  // Handler for user override (select a different row as header)
  const handleHeaderRowSelect = (rowIdx: number) => {
    if (!headerPreview) return;
    const { allRows } = headerPreview;
    const headerRow = allRows[rowIdx] || [];
    const dataRows = allRows.slice(rowIdx + 1);
    setHeaderPreview({ ...headerPreview, headerRow, dataRows });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  return (
    <Box>
      <Paper {...getRootProps()} sx={{ 
        p: 3, 
        textAlign: 'center', 
        cursor: 'pointer', 
        bgcolor: isDragActive ? '#F9ECEF' : '#FDF9FC',
        border: isDragActive ? '2px dashed #8A0051' : '2px dashed #EFCCDB',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: '#F9ECEF',
          borderColor: '#8A0051',
          boxShadow: '0 4px 15px rgba(138, 0, 81, 0.1)'
        }
      }}>
        <input {...getInputProps()} />
        <Typography variant="body1" sx={{ 
          color: isDragActive ? '#8A0051' : '#5C0037',
          fontWeight: 500,
          mb: 1
        }}>
          {isDragActive ? 'Drop the file here...' : 'Drag & drop a CSV or Excel file here, or click to select'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#B8347A' }}>
          Supported formats: .csv, .xlsx, .xls
        </Typography>
      </Paper>
      {sheetNames.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Sheet(s):</Typography>
          <List>
            {sheetNames.map((name) => (
              <ListItem key={name} button onClick={handleToggle(name)}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedSheets.indexOf(name) > -1}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={name} />
              </ListItem>
            ))}
          </List>
          <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Button onClick={handleConfirmSheets} disabled={selectedSheets.length === 0} variant="contained">
              Confirm Sheet Selection
            </Button>
          </Box>
        </Box>
      )}
      {/* Header preview/confirmation dialog */}
      {headerPreview && (
        <Dialog open onClose={() => setHeaderPreview(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #2D1B3D 0%, #8A0051 100%)',
            color: 'white',
            textAlign: 'center',
            py: 3
          }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Step 1: Confirm Header Row
              </Typography>
              <Typography variant="body1" sx={{ color: '#E699C2', fontWeight: 500 }}>
                Tab "{headerPreview.tabName}" ({headerPreview.currentUINumber} of {headerPreview.totalUIs})
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051' }}>
              📊 Select which row contains the column headers for this tab:
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {headerPreview.allRows.slice(0, MAX_HEADER_SCAN_ROWS).map((row, idx) => (
                    <tr
                      key={idx}
                      style={{ background: row === headerPreview.headerRow ? '#e3f2fd' : undefined, cursor: 'pointer' }}
                      onClick={() => handleHeaderRowSelect(idx)}
                    >
                      {Array.isArray(row) ? row.map((cell, i) => (
                        <td key={i} style={{ padding: 4, border: '1px solid #ccc' }}>{cell}</td>
                      )) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Click a row to select as header. Only the first 10 rows are shown for preview.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setHeaderPreview(null)} sx={{ mr: 1 }}>
              Cancel Import
            </Button>
            <Button 
              onClick={handleHeaderConfirm} 
              variant="contained"
              sx={{ px: 3 }}
            >
              Next: Configure Data Import →
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default FileUpload; 