import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { 
  Box, Typography, FormControl, InputLabel, Select, MenuItem, 
  FormControlLabel, Switch, Paper, Grid, Chip 
} from '@mui/material';
import type { ParsedData } from './FileUpload';
import { colorManager } from '../utils/ColorManager';
import ColorEditor from './ColorEditor';

interface ParameterVisualizationProps {
  data: ParsedData;
  availableParameters: string[];
}

const ParameterVisualization: React.FC<ParameterVisualizationProps> = ({ 
  data, 
  availableParameters 
}) => {
  const [selectedParameter, setSelectedParameter] = useState(availableParameters[0] || '');
  const [selectedGroupField, setSelectedGroupField] = useState<string>('');
  const [showIndividualAnimals, setShowIndividualAnimals] = useState(false);
  const [showGroupAverages, setShowGroupAverages] = useState(true);
  const [showIndividualSubplots, setShowIndividualSubplots] = useState(false);
  const [colorUpdateTrigger, setColorUpdateTrigger] = useState(0);

  // Get available metadata fields (potential grouping variables)
  const availableGroupFields = useMemo(() => {
    if (!data.length) return [];
    const excludeFields = new Set(['animalId', 'studyDay', 'date', 'measurementDate', ...availableParameters]);
    const metadataFields = new Set<string>();
    
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!excludeFields.has(key) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
          metadataFields.add(key);
        }
      });
    });
    
    return Array.from(metadataFields).sort();
  }, [data, availableParameters]);

  // Auto-select first available group field
  React.useEffect(() => {
    if (availableGroupFields.length > 0 && !selectedGroupField) {
      setSelectedGroupField(availableGroupFields[0]);
    }
  }, [availableGroupFields, selectedGroupField]);

  // Get available groups from selected group field
  const availableGroups = useMemo(() => {
    if (!selectedGroupField) return [];
    const groups = new Set<string>();
    data.forEach(row => {
      const groupValue = row[selectedGroupField];
      if (groupValue && typeof groupValue === 'string') {
        groups.add(groupValue);
      }
    });
    return Array.from(groups).sort();
  }, [data, selectedGroupField]);

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!selectedParameter || !data.length) return { traces: [], layout: {} };

    const traces: any[] = [];
    
    // Group data by animal and group
    const animalData = new Map<string, { 
      group: string | null; 
      timepoints: { studyDay: number; value: number }[] 
    }>();

    data.forEach(row => {
      const animalId = row.animalId;
      const studyDay = Number(row.studyDay);
      const value = Number(row[selectedParameter]);
      const group = selectedGroupField ? (row[selectedGroupField] || 'No Group') : 'No Group';

      if (!animalId || isNaN(studyDay) || isNaN(value)) return;

      if (!animalData.has(animalId)) {
        animalData.set(animalId, { group, timepoints: [] });
      }
      
      animalData.get(animalId)!.timepoints.push({ studyDay, value });
    });

    // Sort timepoints for each animal
    animalData.forEach(animal => {
      animal.timepoints.sort((a, b) => a.studyDay - b.studyDay);
    });

    // Individual animal traces
    if (showIndividualAnimals) {
      animalData.forEach((animal, animalId) => {
        const groupName = animal.group || 'No Group';
        const color = colorManager.getColor(groupName);
        traces.push({
          x: animal.timepoints.map(tp => tp.studyDay),
          y: animal.timepoints.map(tp => tp.value),
          type: 'scatter',
          mode: 'lines+markers',
          name: `${animalId} (${groupName})`,
          line: { color: color + '80', width: 1 }, // Add transparency
          marker: { size: 4, color: color + '80' },
          showlegend: false,
          hovertemplate: `Animal: ${animalId}<br>Group: ${groupName}<br>Day: %{x}<br>${selectedParameter}: %{y}<extra></extra>`
        });
      });
    }

    // Group average traces
    if (showGroupAverages && availableGroups.length > 0) {
      availableGroups.forEach(group => {
        // Get all timepoints for this group
        const groupTimepoints = new Map<number, number[]>();
        
        animalData.forEach((animal, animalId) => {
          if (animal.group === group) {
            animal.timepoints.forEach(tp => {
              if (!groupTimepoints.has(tp.studyDay)) {
                groupTimepoints.set(tp.studyDay, []);
              }
              groupTimepoints.get(tp.studyDay)!.push(tp.value);
            });
          }
        });

        // Calculate means and SEMs
        const sortedDays = Array.from(groupTimepoints.keys()).sort((a, b) => a - b);
        const means = sortedDays.map(day => {
          const values = groupTimepoints.get(day)!;
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        });
        
        const sems = sortedDays.map(day => {
          const values = groupTimepoints.get(day)!;
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          return Math.sqrt(variance) / Math.sqrt(values.length);
        });

        const color = colorManager.getColor(group);

        // Single curve with error bars
        traces.push({
          x: sortedDays,
          y: means,
          error_y: {
            type: 'data',
            array: sems,
            visible: true,
            color: color,
            thickness: 2,
            width: 4
          },
          type: 'scatter',
          mode: 'lines+markers',
          name: group,
          line: { color, width: 3 },
          marker: { size: 6, color },
          hovertemplate: `Group: ${group}<br>Day: %{x}<br>Mean ${selectedParameter}: %{y:.2f} ± %{error_y.array:.2f}<extra></extra>`
        });
      });
    }

    const layout = {
      title: `${selectedParameter} Over Time`,
      xaxis: { 
        title: 'Study Day',
        showgrid: true,
        gridcolor: '#f0f0f0'
      },
      yaxis: { 
        title: selectedParameter,
        showgrid: true,
        gridcolor: '#f0f0f0'
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      hovermode: 'closest',
      legend: {
        x: 1.05,
        y: 1,
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#ccc',
        borderwidth: 1
      }
    };

    return { traces, layout };
  }, [selectedParameter, data, showIndividualAnimals, showGroupAverages, availableGroups, selectedGroupField, colorUpdateTrigger]);

  // Individual subplot data
  const individualSubplotData = useMemo(() => {
    if (!selectedParameter || !data.length || !showIndividualSubplots || availableGroups.length === 0) {
      return { traces: [], layout: {} };
    }

    const traces: any[] = [];
    const groupData = new Map<string, Map<string, { studyDay: number; value: number }[]>>();

    // Group data by group and animal
    data.forEach(row => {
      const animalId = row.animalId;
      const studyDay = Number(row.studyDay);
      const value = Number(row[selectedParameter]);
      const group = selectedGroupField ? (row[selectedGroupField] || 'No Group') : 'No Group';

      if (!animalId || isNaN(studyDay) || isNaN(value)) return;

      if (!groupData.has(group)) {
        groupData.set(group, new Map());
      }
      
      const animalMap = groupData.get(group)!;
      if (!animalMap.has(animalId)) {
        animalMap.set(animalId, []);
      }
      animalMap.get(animalId)!.push({ studyDay, value });
    });

    // Sort timepoints for each animal
    groupData.forEach(group => {
      group.forEach(animal => {
        animal.sort((a, b) => a.studyDay - b.studyDay);
      });
    });

    const numGroups = availableGroups.length;
    
    // Calculate global y-axis range from all data first
    let globalYMin = Infinity;
    let globalYMax = -Infinity;
    
    groupData.forEach(animalMap => {
      animalMap.forEach(timepoints => {
        timepoints.forEach(tp => {
          globalYMin = Math.min(globalYMin, tp.value);
          globalYMax = Math.max(globalYMax, tp.value);
        });
      });
    });
    
    // Add some padding to the range
    const yRange = globalYMax - globalYMin;
    const padding = yRange * 0.1;
    const yMin = globalYMin - padding;
    const yMax = globalYMax + padding;

    // Create traces for each group
    availableGroups.forEach((groupName, groupIdx) => {
      const animalMap = groupData.get(groupName);
      if (!animalMap) return;

      const color = colorManager.getColor(groupName);
      
      animalMap.forEach((timepoints, animalId) => {
        traces.push({
          x: timepoints.map(tp => tp.studyDay),
          y: timepoints.map(tp => tp.value),
          type: 'scatter',
          mode: 'lines+markers',
          name: `${groupName}: ${animalId}`,
          line: { color: color + '80', width: 2 },
          marker: { size: 4, color },
          yaxis: groupIdx === 0 ? 'y' : `y${groupIdx + 1}`,
          xaxis: groupIdx === 0 ? 'x' : `x${groupIdx + 1}`,
          showlegend: false,
          hovertemplate: `Group: ${groupName}<br>Animal: ${animalId}<br>Day: %{x}<br>${selectedParameter}: %{y}<extra></extra>`
        });
      });
    });

    // Create layout with multiple y-axes (subplots)
    const layout: any = {
      title: `${selectedParameter} Over Time - Individual Animals by Group`,
      showlegend: false,
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      hovermode: 'closest',
      height: Math.max(400, numGroups * 280),
      annotations: []
    };

    // Set up axes for each subplot
    const subplotHeight = 0.8 / numGroups; // Use 80% of height for plots, leave space for titles
    const subplotSpacing = 0.15 / Math.max(1, numGroups - 1); // Space between subplots
    
    availableGroups.forEach((groupName, groupIdx) => {
      const isFirst = groupIdx === 0;
      const isLast = groupIdx === numGroups - 1;
      
      // Calculate y-domain for this subplot
      const plotAreaTop = 0.95;
      const plotAreaBottom = 0.05;
      const totalPlotHeight = plotAreaTop - plotAreaBottom;
      const individualHeight = totalPlotHeight / numGroups;
      
      const yTop = plotAreaTop - (groupIdx * individualHeight);
      const yBottom = yTop - individualHeight + 0.02; // Small padding

      // X-axis configuration
      const xAxisKey = isFirst ? 'xaxis' : `xaxis${groupIdx + 1}`;
      layout[xAxisKey] = {
        domain: [0.1, 0.9],
        anchor: isFirst ? 'y' : `y${groupIdx + 1}`,
        title: isLast ? 'Study Day' : '',
        showgrid: true,
        gridcolor: '#f0f0f0',
        zeroline: false
      };

      // Y-axis configuration
      const yAxisKey = isFirst ? 'yaxis' : `yaxis${groupIdx + 1}`;
      layout[yAxisKey] = {
        domain: [yBottom, yTop],
        anchor: isFirst ? 'x' : `x${groupIdx + 1}`,
        title: selectedParameter,
        range: [yMin, yMax],
        showgrid: true,
        gridcolor: '#f0f0f0',
        zeroline: false
      };

      // Add group title annotation
      layout.annotations.push({
        text: `<b>${groupName}</b>`,
        showarrow: false,
        x: 0.02,
        y: (yBottom + yTop) / 2,
        xref: 'paper',
        yref: 'paper',
        font: { size: 14, color: colorManager.getColor(groupName) },
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: colorManager.getColor(groupName),
        borderwidth: 1,
        xanchor: 'left'
      });

      // Add animal list
      const animalMap = groupData.get(groupName);
      if (animalMap) {
        const animalIds = Array.from(animalMap.keys()).sort();
        const legendText = `Animals: ${animalIds.join(', ')}`;
        
        layout.annotations.push({
          text: legendText,
          showarrow: false,
          x: 0.98,
          y: (yBottom + yTop) / 2,
          xref: 'paper',
          yref: 'paper',
          font: { size: 10, color: '#666' },
          bgcolor: 'rgba(255,255,255,0.8)',
          bordercolor: '#ddd',
          borderwidth: 1,
          xanchor: 'right'
        });
      }
    });

    return { traces, layout };
  }, [selectedParameter, data, showIndividualSubplots, availableGroups, selectedGroupField, colorUpdateTrigger]);

  if (!availableParameters.length) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No parameters available for visualization. Please import data first.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3, color: '#8A0051', fontWeight: 600 }}>
        📊 Parameter Visualization
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Parameter</InputLabel>
              <Select
                value={selectedParameter}
                label="Parameter"
                onChange={(e) => setSelectedParameter(e.target.value)}
              >
                {availableParameters.map(param => (
                  <MenuItem key={param} value={param}>{param}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Group Field</InputLabel>
              <Select
                value={selectedGroupField}
                label="Group Field"
                onChange={(e) => setSelectedGroupField(e.target.value)}
              >
                {availableGroupFields.map(field => (
                  <MenuItem key={field} value={field}>{field}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showIndividualAnimals}
                  onChange={(e) => setShowIndividualAnimals(e.target.checked)}
                />
              }
              label="Show Individual Animals"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showGroupAverages}
                  onChange={(e) => {
                    setShowGroupAverages(e.target.checked);
                    if (e.target.checked) setShowIndividualSubplots(false);
                  }}
                />
              }
              label="Show Group Averages"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={showIndividualSubplots}
                  onChange={(e) => {
                    setShowIndividualSubplots(e.target.checked);
                    if (e.target.checked) {
                      setShowGroupAverages(false);
                      setShowIndividualAnimals(false);
                    }
                  }}
                />
              }
              label="Show Individual Animals by Group (Subplots)"
            />
          </Grid>
        </Grid>

        {/* Available Groups Display */}
        {availableGroups.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Available Groups:
              </Typography>
              <ColorEditor 
                availableGroups={availableGroups}
                onColorsChanged={() => setColorUpdateTrigger(prev => prev + 1)}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableGroups.map(group => (
                <Chip 
                  key={group} 
                  label={group} 
                  size="small" 
                  sx={{ 
                    bgcolor: colorManager.getColor(group) + '20', 
                    color: colorManager.getColor(group),
                    border: `1px solid ${colorManager.getColor(group)}`,
                    fontWeight: 600
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Plot */}
      <Box sx={{ 
        width: '100%', 
        overflowX: 'auto',
        '& .plotly': { width: '100% !important' }
      }}>
        {showIndividualSubplots ? (
          <Plot
            data={individualSubplotData.traces}
            layout={{
              ...individualSubplotData.layout,
              width: 1000,
              margin: { l: 80, r: 20, t: 80, b: 60 }
            }}
            config={{
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ['pan2d', 'lasso2d']
            }}
          />
        ) : (
          <Plot
            data={chartData.traces}
            layout={{
              ...chartData.layout,
              width: 900,
              height: 500,
              margin: { l: 60, r: 150, t: 60, b: 60 }
            }}
            config={{
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ['pan2d', 'lasso2d']
            }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default ParameterVisualization;