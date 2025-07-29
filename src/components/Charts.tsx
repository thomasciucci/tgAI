import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ParameterVisualization from './ParameterVisualization';
import TGIAnalysis from './TGIAnalysis';
import type { ParsedData } from './FileUpload';

interface ChartsProps {
  data: ParsedData;
  visualizationType?: 'parameter' | 'tgi' | 'waterfall';
}

const Charts: React.FC<ChartsProps> = ({ data, visualizationType = 'parameter' }) => {

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

  // Render appropriate visualization based on type
  switch (visualizationType) {
    case 'parameter':
      return availableParameters.length > 0 ? (
        <ParameterVisualization 
          data={data} 
          availableParameters={availableParameters}
        />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          📊 No parameters available for visualization
        </Typography>
      );
      
    case 'tgi':
    case 'waterfall':
      return hasTumorVolumeData ? (
        <TGIAnalysis data={data} />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          🔬 TGI/Waterfall Analysis not available - requires tumor volume data
        </Typography>
      );
      
    default:
      return (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Invalid visualization type
        </Typography>
      );
  }
};

export default Charts; 