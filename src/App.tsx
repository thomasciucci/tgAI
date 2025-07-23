import React, { useRef, useState } from 'react';
import { Container, Typography, Box, Paper, Grid, Button, Checkbox, FormControlLabel, TextField } from '@mui/material';
import FileUpload, { triggerNextSheetProcessing } from './components/FileUpload';
import type { ParsedData } from './components/FileUpload';
import DataTable from './components/DataTable';
import Charts from './components/Charts';
import { AnimalDataManager } from './utils/AnimalDataManager';
import type { AnimalRecord } from './utils/AnimalDataManager';
import Plot from 'react-plotly.js';
import ColumnMappingDialog from './components/ColumnMappingDialog';
import MetadataImportDialog from './components/MetadataImportDialog';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// Simple timeline table for demonstration
const AnimalTimelineView: React.FC<{ animal?: AnimalRecord }> = ({ animal }) => {
  if (!animal) return <div>Select an animal to view timeline.</div>;
  const allParams = Array.from(
    new Set(animal.measurements.flatMap(m => Object.keys(m.measurements)))
  );
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Timeline for Animal {animal.animalId}</Typography>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Study Day</th>
            <th>Date</th>
            {allParams.map(param => (
              <th key={param}>{param}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {animal.measurements.map((m, idx) => (
            <tr key={idx}>
              <td>{m.studyDay}</td>
              <td>{m.date}</td>
              {allParams.map(param => (
                <td key={param}>{m.measurements[param] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

// Timeline chart for selected animal with parameter selection
const AnimalTimelineChart: React.FC<{ animal?: AnimalRecord }> = ({ animal }) => {
  const [selectedParams, setSelectedParams] = useState<string[]>([]);
  if (!animal || animal.measurements.length === 0) return <div>No data for this animal.</div>;
  const allParams = Array.from(
    new Set(
      animal.measurements.flatMap(m =>
        Object.entries(m.measurements)
          .filter(([, v]) => typeof v === 'number')
          .map(([k]) => k)
      )
    )
  );
  // Default: select all params on first render
  React.useEffect(() => {
    if (selectedParams.length === 0 && allParams.length > 0) {
      setSelectedParams(allParams);
    }
    // eslint-disable-next-line
  }, [allParams.length]);

  const traces = selectedParams.map(param => ({
    x: animal.measurements.map(m => m.studyDay),
    y: animal.measurements.map(m => typeof m.measurements[param] === 'number' ? m.measurements[param] : null),
    type: 'scatter',
    mode: 'lines+markers',
    name: param
  }));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1">Timeline Chart</Typography>
      <Box sx={{ mb: 1 }}>
        {allParams.map(param => (
          <FormControlLabel
            key={param}
            control={
              <Checkbox
                checked={selectedParams.includes(param)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedParams([...selectedParams, param]);
                  } else {
                    setSelectedParams(selectedParams.filter(p => p !== param));
                  }
                }}
              />
            }
            label={param}
          />
        ))}
      </Box>
      <Plot
        data={traces as any}
        layout={{
          width: 700,
          height: 400,
          title: { text: `Timeline for Animal ${animal.animalId}` },
          xaxis: { title: 'Study Day' },
          yaxis: { title: 'Value' }
        }}
      />
    </Box>
  );
};

function isDateString(val: string) {
  // Simple check for YYYY-MM-DD or MM/DD/YYYY
  return /\d{4}-\d{2}-\d{2}/.test(val) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val);
}
function parseDate(val: string) {
  if (!val || typeof val !== 'string') return null;
  
  // Try to parse as ISO date
  if (/\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try to parse as US date MM/DD/YYYY
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)) {
    const d = parseUSDate(val);
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}
function daysBetween(date1: Date, date2: Date) {
  return Math.round((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}

function parseUSDate(val: string) {
  try {
    // MM/DD/YYYY
    const [m, d, y] = val.split('/');
    if (!m || !d || !y) return new Date(NaN);
    
    let year = y.length === 2 ? '20' + y : y;
    const date = new Date(Number(year), Number(m) - 1, Number(d));
    
    // Validate the date components
    if (date.getFullYear() != Number(year) || 
        date.getMonth() != Number(m) - 1 || 
        date.getDate() != Number(d)) {
      return new Date(NaN);
    }
    
    return date;
  } catch (e) {
    return new Date(NaN);
  }
}

function getEarliestDateInPendingTabs(pendingDateTabs: any[], pendingDateMappings: any[], pendingDateRows: any[]) {
  let minDate: Date | null = null;
  let allDates: Date[] = [];
  pendingDateTabs.forEach((tab, idx) => {
    const mapping = pendingDateMappings[idx];
    const rows = pendingDateRows[idx];
    const timeCol = mapping.timeColumn;
    rows.forEach(row => {
      const val = row[timeCol];
      if (typeof val === 'string') {
        let d: Date | null = null;
        if (/\d{4}-\d{2}-\d{2}/.test(val)) {
          d = new Date(val);
        } else if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)) {
          d = parseUSDate(val);
        }
        if (d && !isNaN(d.getTime())) {
          allDates.push(d);
          if (!minDate || d < minDate) minDate = d;
        }
      }
    });
  });
  if (allDates.length > 0) {
    console.log('All detected dates:', allDates.map(d => d.toISOString()));
    console.log('Earliest date:', minDate?.toISOString());
  }
  return minDate;
}

function App() {
  const dataManagerRef = useRef(new AnimalDataManager());
  const [data, setData] = useState<ParsedData | null>(null);
  const [allAnimals, setAllAnimals] = useState<AnimalRecord[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  // For per-tab mapping
  const [pendingTabs, setPendingTabs] = useState<{ tabName: string; columns: string[]; rows: ParsedData }[]>([]);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [tabMappings, setTabMappings] = useState<any[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  // Metadata import state
  const [showMetadataPrompt, setShowMetadataPrompt] = useState(false);
  const [showMetadataImport, setShowMetadataImport] = useState(false);
  const [showStudyStartPrompt, setShowStudyStartPrompt] = useState(false);
  const [studyStartDate, setStudyStartDate] = useState('');
  const [pendingDateTabs, setPendingDateTabs] = useState<any[]>([]);
  const [pendingDateMappings, setPendingDateMappings] = useState<any[]>([]);
  const [pendingDateRows, setPendingDateRows] = useState<any[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>('');
  const [allTabs, setAllTabs] = useState<{ tabName: string; columns: string[]; rows: ParsedData }[]>([]); // all tabs from file
  const [originalAllTabs, setOriginalAllTabs] = useState<{ tabName: string; columns: string[]; rows: ParsedData }[]>([]); // ALL tabs from file (for metadata)

  // Compute available parameters from data
  const availableParameters = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    // Exclude known fields
    const exclude = new Set(['animalId', 'group', 'sex', 'strain', 'studyDay', 'date', 'measurementDate']);
    const params = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!exclude.has(key) && typeof row[key] === 'number') {
          params.add(key);
        }
      });
    });
    return Array.from(params);
  }, [data]);

  // Set default selected parameter when data changes
  React.useEffect(() => {
    if (availableParameters.length > 0 && !selectedParameter) {
      setSelectedParameter(availableParameters[0]);
    }
  }, [availableParameters, selectedParameter]);

  // Called after user selects tabs and data is parsed for each
  // Now receives individual tabs one at a time
  const handleTabsParsed = (tabs: { tabName: string; columns: string[]; rows: ParsedData; currentTabNumber?: number; totalTabs?: number; currentUINumber?: number; totalUIs?: number }[]) => {
    // Since FileUpload now sends one tab at a time, we should receive a single tab
    const newTab = tabs[0];
    if (!newTab) return;
    
    console.log(`Received tab: ${newTab.tabName} with ${newTab.columns.length} columns`);
    
    // Add this tab to our accumulated tabs
    setAllTabs(prev => {
      const updated = [...prev, newTab];
      console.log(`Total tabs accumulated: ${updated.length}`);
      return updated;
    });
    
    // Set this as the pending tab to show mapping dialog with progress info
    setPendingTabs([{ ...newTab, currentTabNumber: newTab.currentTabNumber, totalTabs: newTab.totalTabs, currentUINumber: newTab.currentUINumber, totalUIs: newTab.totalUIs }]);
    setCurrentTabIndex(0);
    setShowMappingDialog(true);
  };

  // Called when user confirms mapping for a tab
  const handleMappingConfirm = (mapping: { animalIdColumn: string; timeColumn: string; parameterColumns: string[] }) => {
    const tab = pendingTabs[currentTabIndex];
    const newTabMapping = { tabName: tab.tabName, mapping, rows: tab.rows };
    
    console.log(`Tab ${tab.tabName} mapped with parameters:`, mapping.parameterColumns);
    
    // Add this tab mapping to accumulated mappings
    setTabMappings(prev => {
      const updated = [...prev, newTabMapping];
      console.log(`Updated tab mappings:`, updated.map(t => ({ name: t.tabName, params: t.mapping.parameterColumns })));
      return updated;
    });
    
    // Check if time column is a date in this tab
    const timeCol = mapping.timeColumn;
    const firstRow = tab.rows.find(r => r[timeCol]);
    if (firstRow && typeof firstRow[timeCol] === 'string' && isDateString(firstRow[timeCol])) {
      // Save for later conversion
      setPendingDateTabs(prev => [...prev, tab]);
      setPendingDateMappings(prev => [...prev, mapping]);
      setPendingDateRows(prev => [...prev, tab.rows]);
    }
    
    // Close current mapping dialog
    setShowMappingDialog(false);
    setPendingTabs([]);
    setCurrentTabIndex(0);
    
    console.log(`Tab mapped. Current tab mappings count: ${tabMappings.length + 1}`);
    
    // Trigger next sheet processing in FileUpload component
    triggerNextSheetProcessing();
  };

  // Metadata import dialog logic
  const handleMetadataImport = () => {
    setShowMetadataPrompt(false);
    setShowMetadataImport(true);
  };

  // When user confirms metadata import from new dialog
  const handleMetadataImportConfirm = (metadata: { 
    sourceTab: string; 
    animalIdColumn: string; 
    metadataColumns: string[]; 
    mappingPreview: any[] 
  }) => {
    console.log('Importing metadata:', metadata);
    
    // Find the source tab from ALL tabs in the file
    const metaTab = originalAllTabs.find(tab => tab.tabName === metadata.sourceTab);
    if (!metaTab) {
      console.error('Source tab not found:', metadata.sourceTab);
      return;
    }

    // Create metadata map by animal ID
    const metaMap = new Map();
    metaTab.rows.forEach(row => {
      const animalId = row[metadata.animalIdColumn];
      if (animalId) { // Only add if animal ID exists
        metaMap.set(animalId, row);
      }
    });

    console.log(`Created metadata map for ${metaMap.size} animals`);

    // Merge metadata into main data
    setData(prevData => {
      if (!prevData) return prevData;
      
      const updated = prevData.map(row => {
        const meta = metaMap.get(row.animalId);
        const newRow = { ...row };
        
        // Add each metadata field
        metadata.metadataColumns.forEach(field => {
          newRow[field] = meta ? (meta[field] || 'N/A') : 'N/A';
        });
        
        return newRow;
      });

      console.log(`Updated ${updated.length} data rows with metadata`);

      // Refresh animal data manager
      dataManagerRef.current = new AnimalDataManager();
      dataManagerRef.current.consolidateData(updated);
      setAllAnimals(
        dataManagerRef.current.getAllAnimals().sort((a, b) =>
          a.animalId.localeCompare(b.animalId)
        )
      );

      return updated;
    });

    setShowMetadataImport(false);
  };

  // Study start date dialog confirm
  const handleStudyStartConfirm = () => {
    // Convert dates to study days in allTabs (the original data source)
    const tabsWithConvertedDates = allTabs.map(tab => {
      const tabMapping = [...tabMappings, ...pendingDateTabs.map((pendingTab, idx) => ({ 
        tabName: pendingTab.tabName, 
        mapping: pendingDateMappings[idx] 
      }))].find(tm => tm.tabName === tab.tabName);
      
      if (!tabMapping) return tab;
      
      const { timeColumn } = tabMapping.mapping;
      const convertedRows = tab.rows.map(row => {
        const newRow = { ...row };
        if (typeof newRow[timeColumn] === 'string' && isDateString(newRow[timeColumn])) {
          const d = parseDate(newRow[timeColumn]);
          const start = parseDate(studyStartDate);
          if (d && start) {
            const day = daysBetween(d, start);
            if (!isNaN(day)) {
              newRow[timeColumn] = day;
            }
          }
        }
        return newRow;
      });
      
      return { ...tab, rows: convertedRows };
    });
    
    // Update allTabs with converted dates
    setAllTabs(tabsWithConvertedDates);
    
    // Merge all mapped tabs - use converted date tabs where available, otherwise use original tabMappings
    const convertedTabNames = new Set(pendingDateTabs.map(tab => tab.tabName));
    const allTabsToMerge = [
      // Use original tabMappings for tabs that didn't need date conversion
      ...tabMappings.filter(tab => !convertedTabNames.has(tab.tabName)),
      // Use converted data for tabs that had dates
      ...pendingDateTabs.map((tab, idx) => ({ 
        tabName: tab.tabName, 
        mapping: pendingDateMappings[idx],
        rows: tabsWithConvertedDates.find(t => t.tabName === tab.tabName)?.rows || []
      }))
    ];
    
    console.log('Merging after date conversion:', allTabsToMerge.map(t => t.tabName));
    
    mergeTabsAndContinue(allTabsToMerge);
    setShowStudyStartPrompt(false);
    setPendingDateTabs([]);
    setPendingDateMappings([]);
    setPendingDateRows([]);
    setStudyStartDate('');
    setShowMetadataPrompt(true);
  };

  // Helper to robustly find earliest date in all pending date tabs
  React.useEffect(() => {
    if (showStudyStartPrompt) {
      const minDate = getEarliestDateInPendingTabs(pendingDateTabs, pendingDateMappings, pendingDateRows);
      if (minDate && minDate instanceof Date && !isNaN(minDate.getTime())) {
        const yyyy = minDate.getFullYear();
        const mm = String(minDate.getMonth() + 1).padStart(2, '0');
        const dd = String(minDate.getDate()).padStart(2, '0');
        setStudyStartDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  }, [showStudyStartPrompt]);

  // Pass this to FileUpload so it calls handleTabsParsed after tab selection
  // FileUpload should parse each selected tab and call this with an array of { tabName, columns, rows }

  const selectedAnimal = allAnimals.find(a => a.animalId === (selectedAnimalId ? selectedAnimalId.trim() : ''));

  function mergeTabsAndContinue(allTabsToMerge: any[]) {
    const mergedMap = new Map();
    
    console.log('Merging tabs:', allTabsToMerge.map(t => ({ name: t.tabName, params: t.mapping?.parameterColumns })));
    
    allTabsToMerge.forEach((tabMap) => {
      // Use the rows from the tabMap itself if available, otherwise find from allTabs
      let tabRows = tabMap.rows;
      console.log(`Tab ${tabMap.tabName} - tabMap.rows length:`, tabRows?.length || 0);
      
      if (!tabRows || tabRows.length === 0) {
        const origTab = allTabs.find(t => t.tabName === tabMap.tabName);
        tabRows = origTab ? origTab.rows : [];
        console.log(`Tab ${tabMap.tabName} - fallback to allTabs, found:`, tabRows?.length || 0);
      }
      
      const { animalIdColumn, timeColumn, parameterColumns } = tabMap.mapping;
      console.log(`Processing tab ${tabMap.tabName}: ${tabRows.length} rows, params: ${parameterColumns}`);
      
      tabRows.forEach((row: any) => {
        const studyDay = row[timeColumn];
        const animalId = row[animalIdColumn];
        
        // Skip rows with missing essential data
        if (!animalId || studyDay === undefined || studyDay === null || studyDay === '') {
          return;
        }
        
        const key = `${animalId}__${studyDay}`;
        
        if (!mergedMap.has(key)) {
          // Create new merged record with base fields and parameters from this tab
          const merged: any = { 
            animalId, 
            studyDay: Number(studyDay),
          };
          
          // Add parameters from this tab
          parameterColumns.forEach((param: string) => {
            if (row[param] !== undefined && row[param] !== null && row[param] !== '') {
              // Convert to number if it looks like a number
              const value = row[param];
              merged[param] = isNaN(Number(value)) ? value : Number(value);
            }
          });
          
          mergedMap.set(key, merged);
        } else {
          // Merge additional parameters into existing record
          const merged = mergedMap.get(key);
          parameterColumns.forEach((param: string) => {
            if (row[param] !== undefined && row[param] !== null && row[param] !== '') {
              const value = row[param];
              merged[param] = isNaN(Number(value)) ? value : Number(value);
            }
          });
          
          // Note: Metadata should now be added via the explicit metadata import dialog
        }
      });
    });
    
    const mergedRows = Array.from(mergedMap.values());
    console.log(`Final merged data: ${mergedRows.length} records`);
    console.log('Sample merged record:', mergedRows[0]);
    
    dataManagerRef.current = new AnimalDataManager();
    dataManagerRef.current.consolidateData(mergedRows);
    setData(mergedRows);
    setAllAnimals(
      dataManagerRef.current.getAllAnimals().sort((a, b) =>
        a.animalId.localeCompare(b.animalId)
      )
    );
    setSelectedAnimalId(null);
    setShowMappingDialog(false);
    setPendingTabs([]);
    setTabMappings([]);
    setCurrentTabIndex(0);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, minHeight: '100vh', background: 'linear-gradient(135deg, #FDF9FC 0%, #F9ECEF 100%)' }}>
      <Paper elevation={3} sx={{ 
        p: 4, 
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF9FC 100%)',
        border: '1px solid #EFCCDB',
        borderRadius: 3
      }}>
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4, 
          pb: 3, 
          borderBottom: '2px solid #EFCCDB',
          background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
            Tumor Study Data Visualization
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#5C0037', fontWeight: 500 }}>
            Upload, analyze, and visualize your preclinical animal study data entirely in your browser.
          </Typography>
        </Box>
        <Box sx={{ my: 4 }}>
          {/* File Upload */}
          <Paper sx={{ 
            p: 3, 
            mb: 3, 
            border: '1px solid #EFCCDB',
            borderRadius: 2,
            '&:hover': {
              boxShadow: '0 6px 25px rgba(138, 0, 81, 0.1)'
            }
          }}>
            <Typography variant="h6" sx={{ 
              color: '#8A0051', 
              fontWeight: 600, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '"1"',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 700,
                mr: 2
              }
            }}>
              Upload Data File (CSV or Excel)
            </Typography>
            <Box sx={{ mt: 2 }}>
              {/* FileUpload should call handleTabsParsed after tab selection */}
              <FileUpload 
                onTabsParsed={handleTabsParsed} 
                onAllTabsParsed={setOriginalAllTabs}
              />
              {data && (
                <Typography sx={{ mt: 2 }} color="success.main">
                  File loaded: {data.length} rows parsed.
                </Typography>
              )}
              {tabMappings.length > 0 && !data && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#F9ECEF', borderRadius: 1, border: '1px solid #EFCCDB' }}>
                  <Typography variant="body2" sx={{ mb: 2, color: '#8A0051' }}>
                    Mapped {tabMappings.length} tab(s): {tabMappings.map(t => t.tabName).join(', ')}
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      if (pendingDateTabs.length > 0) {
                        setShowStudyStartPrompt(true);
                      } else {
                        console.log('Finishing import with tabMappings:', tabMappings);
                        mergeTabsAndContinue(tabMappings);
                        setShowMetadataPrompt(true);
                      }
                    }}
                    sx={{ mr: 1 }}
                  >
                    Finish Import
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setTabMappings([]);
                      setPendingDateTabs([]);
                      setPendingDateMappings([]);
                      setPendingDateRows([]);
                      setAllTabs([]);
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Column Mapping Dialog for each tab */}
          {pendingTabs.length > 0 && showMappingDialog && (
            <ColumnMappingDialog
              open={showMappingDialog}
              columns={pendingTabs[currentTabIndex].columns}
              tabName={pendingTabs[currentTabIndex].tabName}
              currentTabIndex={(pendingTabs[currentTabIndex] as any).currentUINumber || 1}
              totalTabs={(pendingTabs[currentTabIndex] as any).totalUIs || 1}
              onConfirm={handleMappingConfirm}
              onClose={() => setShowMappingDialog(false)}
            />
          )}

          {/* Animal Table Display */}
          {allAnimals.length > 0 && (
            <Paper sx={{ 
              p: 3, 
              mb: 3,
              border: '1px solid #EFCCDB',
              borderRadius: 2,
              '&:hover': {
                boxShadow: '0 6px 25px rgba(138, 0, 81, 0.1)'
              }
            }}>
              <Typography variant="h6" sx={{ 
                color: '#8A0051', 
                fontWeight: 600, 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '"2"',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  mr: 2
                }
              }}>
                Animal Overview (Sorted by Animal ID)
              </Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th>Animal ID</th>
                    <th>Group</th>
                    <th>Sex</th>
                    <th>Measurements</th>
                  </tr>
                </thead>
                <tbody>
                  {allAnimals.map(animal => (
                    <tr key={animal.animalId} style={{ background: selectedAnimalId === animal.animalId ? '#e3f2fd' : undefined }}>
                      <td>
                        <Button
                          variant={selectedAnimalId === animal.animalId ? 'contained' : 'outlined'}
                          onClick={() => setSelectedAnimalId(animal.animalId.trim())}
                          size="small"
                        >
                          {animal.animalId}
                        </Button>
                      </td>
                      <td>{animal.group || '-'}</td>
                      <td>{animal.sex || '-'}</td>
                      <td>{animal.measurements.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AnimalTimelineView animal={selectedAnimal} />
              <AnimalTimelineChart animal={selectedAnimal} />
            </Paper>
          )}

          {/* Data Table */}
          <Paper sx={{ 
            p: 3, 
            mb: 3,
            border: '1px solid #EFCCDB',
            borderRadius: 2,
            '&:hover': {
              boxShadow: '0 6px 25px rgba(138, 0, 81, 0.1)'
            }
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ 
                color: '#8A0051', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '"3"',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  mr: 2
                }
              }}>
                Data Table
              </Typography>
              <Button variant="outlined" onClick={() => setShowMetadataImport(true)} disabled={originalAllTabs.length === 0}>
                Add Metadata
              </Button>
            </Box>
            <Box sx={{ mt: 2 }}>
              {data && availableParameters.length > 0 && selectedParameter ? (
                <DataTable
                  data={data}
                  availableParameters={availableParameters}
                  selectedParameter={selectedParameter}
                  onParameterChange={setSelectedParameter}
                />
              ) : (
                <Typography color="text.secondary">[Data table UI here]</Typography>
              )}
            </Box>
          </Paper>

          {/* Chart Area */}
          <Paper sx={{ 
            p: 3,
            border: '1px solid #EFCCDB',
            borderRadius: 2,
            '&:hover': {
              boxShadow: '0 6px 25px rgba(138, 0, 81, 0.1)'
            }
          }}>
            <Typography variant="h6" sx={{ 
              color: '#8A0051', 
              fontWeight: 600, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '"4"',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 700,
                mr: 2
              }
            }}>
              Visualizations
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data ? <Charts data={data} /> : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography color="text.secondary">[Tumor growth chart here]</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography color="text.secondary">[Waterfall/weight chart here]</Typography>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
        </Box>
      </Paper>
      {/* Metadata import prompt */}
      <Dialog open={showMetadataPrompt} onClose={() => setShowMetadataPrompt(false)}>
        <DialogTitle>Add Animal Metadata?</DialogTitle>
        <DialogContent>
          <Typography>Do you want to add additional animal metadata (e.g., group, treatment, sex) from another tab?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMetadataPrompt(false)}>No</Button>
          <Button onClick={handleMetadataImport} variant="contained">Yes</Button>
        </DialogActions>
      </Dialog>
      {/* New Metadata Import Dialog */}
      <MetadataImportDialog
        open={showMetadataImport}
        allTabs={originalAllTabs}
        onConfirm={handleMetadataImportConfirm}
        onClose={() => setShowMetadataImport(false)}
      />
      {/* Study start date prompt */}
      <Dialog open={showStudyStartPrompt} onClose={() => setShowStudyStartPrompt(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #2D1B3D 0%, #8A0051 100%)',
          color: 'white',
          textAlign: 'center',
          py: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            📅 Study Start Date Required
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography gutterBottom sx={{ fontWeight: 500, color: '#8A0051', mb: 2 }}>
            Date columns were detected. Please specify the study start date to convert dates to study days.
          </Typography>
          {getEarliestDateInPendingTabs(pendingDateTabs, pendingDateMappings, pendingDateRows) && (
            <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: '#F9ECEF', borderRadius: 1 }}>
              📊 <strong>Earliest date found:</strong> {getEarliestDateInPendingTabs(pendingDateTabs, pendingDateMappings, pendingDateRows)?.toDateString()}
              <br />
              💡 <strong>Tip:</strong> Use this or an earlier date as your study start date.
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Study Start Date"
            type="date"
            fullWidth
            value={studyStartDate}
            onChange={e => setStudyStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Study days will be calculated as: (Date - Start Date)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowStudyStartPrompt(false)} sx={{ mr: 1 }}>
            Cancel Import
          </Button>
          <Button onClick={handleStudyStartConfirm} variant="contained" disabled={!studyStartDate} sx={{ px: 3 }}>
            Convert Dates to Study Days
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
