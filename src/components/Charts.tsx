import React, { useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, Divider } from '@mui/material';
import ParameterVisualization from './ParameterVisualization';
import TGIAnalysis from './TGIAnalysis';
import type { ParsedData } from './FileUpload';

interface ChartsProps {
  data: ParsedData;
}

const Charts: React.FC<ChartsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Compute available parameters from data
  const availableParameters = useMemo(() => {
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

  // Check if we have tumor volume data for TGI analysis
  const hasTumorVolumeData = useMemo(() => {
    const tumorVolumeColumns = ['Volume', 'TumorVolume', 'Tumor_Volume', 'volume', 'tumor_volume'];
    return tumorVolumeColumns.some(col => 
      data.some(row => row[col] !== undefined && row[col] !== null && row[col] !== '')
    );
  }, [data]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary" variant="h6">
          📊 No data available for visualization
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Please upload and import data to see visualizations.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
            },
            '& .Mui-selected': {
              color: '#8A0051 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8A0051',
            },
          }}
        >
          <Tab 
            label="📊 Parameter Visualization" 
            disabled={availableParameters.length === 0}
          />
          <Tab 
            label="🔬 TGI Analysis" 
            disabled={!hasTumorVolumeData}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && (
          <ParameterVisualization 
            data={data} 
            availableParameters={availableParameters}
          />
        )}
        
        {activeTab === 1 && hasTumorVolumeData && (
          <TGIAnalysis data={data} />
        )}
      </Box>

      {/* Help Information */}
      <Box sx={{ mt: 4, p: 3, bgcolor: '#FDF9FC', borderRadius: 2, border: '1px solid #EFCCDB' }}>
        <Typography variant="h6" sx={{ color: '#8A0051', mb: 2, fontWeight: 600 }}>
          📋 Visualization Guide
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>Parameter Visualization:</strong> Plot any imported parameter over time. Toggle between individual animals and group averages with error bars (SEM).
        </Typography>
        
        {hasTumorVolumeData ? (
          <Typography variant="body2">
            <strong>TGI Analysis:</strong> Tumor Growth Inhibition analysis with TGI over time plots and Best Response waterfall plots. Select a control group for comparisons.
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: '#666' }}>
            <strong>TGI Analysis:</strong> Not available - requires tumor volume data (columns: Volume, TumorVolume, etc.)
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Charts; 