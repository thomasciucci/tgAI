import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { 
  Box, Typography, FormControl, InputLabel, Select, MenuItem, 
  Paper, Grid, Button, Chip, Alert, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import type { ParsedData } from './FileUpload';
import { colorManager } from '../utils/ColorManager';
import ColorEditor from './ColorEditor';
import { calculateTGIAtTimepoint, getSignificanceLevel, type TGIStatistics } from '../utils/StatisticalAnalysis';

interface TGIAnalysisProps {
  data: ParsedData;
}

interface TGIResult {
  group: string;
  tgi: number;
  pValue: number;
  significance: string;
  animalCount: number;
  controlMean: number;
  treatmentMean: number;
}

interface WaterfallData {
  animalId: string;
  group: string;
  baselineVolume: number;
  responseVolume: number;
  percentChange: number;
  bestResponse: number;
}

const TGIAnalysis: React.FC<TGIAnalysisProps> = ({ data }) => {
  const [controlGroup, setControlGroup] = useState<string>('');
  const [selectedTimepoint, setSelectedTimepoint] = useState<number>(21);
  const [analysisType, setAnalysisType] = useState<'overtime' | 'waterfall'>('overtime');
  const [selectedGroupField, setSelectedGroupField] = useState<string>('');
  const [colorUpdateTrigger, setColorUpdateTrigger] = useState(0);
  const [waterfallType, setWaterfallType] = useState<'timepoint' | 'best' | 'vs_control'>('timepoint');
  const [baselineTimepoint, setBaselineTimepoint] = useState<number>(0);

  // Check if we have tumor volume data
  const hasTumorVolumeData = useMemo(() => {
    const tumorVolumeColumns = ['Volume', 'TumorVolume', 'Tumor_Volume', 'volume', 'tumor_volume'];
    return tumorVolumeColumns.some(col => 
      data.some(row => row[col] !== undefined && row[col] !== null && row[col] !== '')
    );
  }, [data]);

  // Find tumor volume column
  const tumorVolumeColumn = useMemo(() => {
    const tumorVolumeColumns = ['Volume', 'TumorVolume', 'Tumor_Volume', 'volume', 'tumor_volume'];
    return tumorVolumeColumns.find(col => 
      data.some(row => row[col] !== undefined && row[col] !== null && row[col] !== '')
    ) || '';
  }, [data]);

  // Get available metadata fields (potential grouping variables)
  const availableGroupFields = useMemo(() => {
    if (!data.length) return [];
    const excludeFields = new Set(['animalId', 'studyDay', 'date', 'measurementDate']);
    const metadataFields = new Set<string>();
    
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!excludeFields.has(key) && typeof row[key] !== 'number' && row[key] !== undefined && row[key] !== null && row[key] !== '') {
          metadataFields.add(key);
        }
      });
    });
    
    return Array.from(metadataFields).sort();
  }, [data]);

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

  // Get available timepoints
  const availableTimepoints = useMemo(() => {
    const timepoints = new Set<number>();
    data.forEach(row => {
      const studyDay = Number(row.studyDay);
      if (!isNaN(studyDay)) {
        timepoints.add(studyDay);
      }
    });
    return Array.from(timepoints).sort((a, b) => a - b);
  }, [data]);

  // Auto-set baseline to earliest timepoint
  React.useEffect(() => {
    if (availableTimepoints.length > 0 && baselineTimepoint === 0) {
      setBaselineTimepoint(availableTimepoints[0]);
    }
  }, [availableTimepoints, baselineTimepoint]);

  // Calculate TGI over time with proper statistics
  const tgiOverTime = useMemo(() => {
    if (!controlGroup || !tumorVolumeColumn) return { traces: [], layout: {}, statistics: new Map() };

    const traces: any[] = [];
    const tgiStatistics = new Map<string, Map<number, TGIStatistics>>();
    
    // Organize data by animal for proper baseline tracking
    const animalData = new Map<string, { 
      group: string; 
      timepoints: { studyDay: number; volume: number }[] 
    }>();

    data.forEach(row => {
      const animalId = row.animalId;
      const group = selectedGroupField ? row[selectedGroupField] : null;
      const studyDay = Number(row.studyDay);
      const volume = Number(row[tumorVolumeColumn]);

      if (!animalId || !group || isNaN(studyDay) || isNaN(volume)) return;

      if (!animalData.has(animalId)) {
        animalData.set(animalId, { group, timepoints: [] });
      }
      
      animalData.get(animalId)!.timepoints.push({ studyDay, volume });
    });

    // Sort timepoints for each animal
    animalData.forEach(animal => {
      animal.timepoints.sort((a, b) => a.studyDay - b.studyDay);
    });

    // Get all timepoints and baseline
    const allTimepoints = new Set<number>();
    animalData.forEach(animal => {
      animal.timepoints.forEach(tp => allTimepoints.add(tp.studyDay));
    });
    const sortedTimepoints = Array.from(allTimepoints).sort((a, b) => a - b);
    const baselineTimepoint = sortedTimepoints[0];

    // Calculate TGI for each treatment group at each timepoint
    availableGroups.forEach(group => {
      if (group === controlGroup) return;

      const tgiValues: number[] = [];
      const tgiSEMValues: number[] = [];
      const validTimepoints: number[] = [];
      const groupStats = new Map<number, TGIStatistics>();

      sortedTimepoints.forEach(timepoint => {
        // Get control and treatment data for this timepoint
        const controlAnimals: { animalId: string; baseline: number; volume: number }[] = [];
        const treatmentAnimals: { animalId: string; baseline: number; volume: number }[] = [];

        animalData.forEach((animal, animalId) => {
          if (animal.group === controlGroup) {
            const baseline = animal.timepoints.find(tp => tp.studyDay === baselineTimepoint)?.volume;
            const current = animal.timepoints.find(tp => tp.studyDay === timepoint)?.volume;
            if (baseline !== undefined && current !== undefined) {
              controlAnimals.push({ animalId, baseline, volume: current });
            }
          } else if (animal.group === group) {
            const baseline = animal.timepoints.find(tp => tp.studyDay === baselineTimepoint)?.volume;
            const current = animal.timepoints.find(tp => tp.studyDay === timepoint)?.volume;
            if (baseline !== undefined && current !== undefined) {
              treatmentAnimals.push({ animalId, baseline, volume: current });
            }
          }
        });

        // Calculate TGI statistics for this timepoint
        if (controlAnimals.length >= 3 && treatmentAnimals.length >= 3) {
          const stats = calculateTGIAtTimepoint(treatmentAnimals, controlAnimals);
          groupStats.set(timepoint, stats);
          
          tgiValues.push(stats.tgi);
          tgiSEMValues.push(stats.tgiSEM);
          validTimepoints.push(timepoint);
        }
      });

      tgiStatistics.set(group, groupStats);

      if (validTimepoints.length > 0) {
        const color = colorManager.getColor(group);
        
        // Main TGI line
        traces.push({
          x: validTimepoints,
          y: tgiValues,
          error_y: {
            type: 'data',
            array: tgiSEMValues,
            visible: true,
            color: color,
            thickness: 2,
            width: 4
          },
          type: 'scatter',
          mode: 'lines+markers',
          name: `${group} vs ${controlGroup}`,
          line: { color, width: 3 },
          marker: { size: 8, color },
          hovertemplate: `<b>${group} vs ${controlGroup}</b><br>Day: %{x}<br>TGI: %{y:.1f} ± %{error_y.array:.1f}%<br>p-value: %{customdata:.4f}<extra></extra>`,
          customdata: validTimepoints.map(tp => groupStats.get(tp)?.pValue || 1)
        });
      }
    });

    // Add reference lines
    traces.push({
      x: sortedTimepoints,
      y: Array(sortedTimepoints.length).fill(0),
      type: 'scatter',
      mode: 'lines',
      name: 'No Effect (0%)',
      line: { color: 'black', width: 2, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    traces.push({
      x: sortedTimepoints,
      y: Array(sortedTimepoints.length).fill(100),
      type: 'scatter',
      mode: 'lines',
      name: 'Complete Inhibition (100%)',
      line: { color: 'red', width: 2, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    // Add significance indicators
    const annotations: any[] = [];
    tgiStatistics.forEach((groupStats, group) => {
      groupStats.forEach((stats, timepoint) => {
        if (stats.pValue < 0.05) {
          const significance = getSignificanceLevel(stats.pValue);
          annotations.push({
            x: timepoint,
            y: stats.tgi + stats.tgiSEM + 10,
            text: significance,
            showarrow: false,
            font: { size: 12, color: colorManager.getColor(group) },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: colorManager.getColor(group),
            borderwidth: 1
          });
        }
      });
    });

    const layout = {
      title: { text: `Tumor Growth Inhibition Over Time (vs ${controlGroup}) - Statistical Analysis` },
      xaxis: { 
        title: 'Study Day',
        showgrid: true,
        gridcolor: '#f0f0f0'
      },
      yaxis: { 
        title: 'TGI (%) ± SEM',
        showgrid: true,
        gridcolor: '#f0f0f0',
        range: [-150, 150]
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      hovermode: 'closest',
      annotations
    };

    return { traces, layout, statistics: tgiStatistics };
  }, [data, controlGroup, tumorVolumeColumn, availableTimepoints, selectedGroupField, colorUpdateTrigger, availableGroups]);

  // Calculate waterfall data for different analysis types
  const waterfallData = useMemo(() => {
    if (!tumorVolumeColumn) return [];

    const animalData = new Map<string, {
      group: string;
      volumes: { studyDay: number; volume: number }[];
    }>();

    // Collect data by animal
    data.forEach(row => {
      const animalId = row.animalId;
      const group = selectedGroupField ? (row[selectedGroupField] || 'No Group') : 'No Group';
      const studyDay = Number(row.studyDay);
      const volume = Number(row[tumorVolumeColumn]);

      if (!animalId || isNaN(studyDay) || isNaN(volume)) return;

      if (!animalData.has(animalId)) {
        animalData.set(animalId, { group, volumes: [] });
      }

      animalData.get(animalId)!.volumes.push({ studyDay, volume });
    });

    // Get control group data for vs_control analysis
    const controlAnimalData = new Map<string, { studyDay: number; volume: number }[]>();
    if (waterfallType === 'vs_control' && controlGroup) {
      animalData.forEach((animal, animalId) => {
        if (animal.group === controlGroup) {
          controlAnimalData.set(animalId, animal.volumes);
        }
      });
    }

    const waterfallResults: WaterfallData[] = [];

    animalData.forEach((animal, animalId) => {
      // Sort volumes by study day
      animal.volumes.sort((a, b) => a.studyDay - b.studyDay);
      
      // Get baseline measurement
      const baseline = animal.volumes.find(v => v.studyDay === baselineTimepoint);
      if (!baseline) return;

      let percentChange = 0;
      let responseVolume = baseline.volume;

      if (waterfallType === 'timepoint') {
        // Response at selected timepoint vs baseline
        let responsePoint = animal.volumes.find(v => v.studyDay === selectedTimepoint);
        if (!responsePoint) {
          // Find closest timepoint
          let closestDiff = Infinity;
          animal.volumes.forEach(v => {
            const diff = Math.abs(v.studyDay - selectedTimepoint);
            if (diff < closestDiff) {
              closestDiff = diff;
              responsePoint = v;
            }
          });
        }
        if (responsePoint) {
          percentChange = ((responsePoint.volume - baseline.volume) / baseline.volume) * 100;
          responseVolume = responsePoint.volume;
        }

      } else if (waterfallType === 'best') {
        // Best response (minimum volume) vs baseline
        const bestResponseVolume = Math.min(...animal.volumes.map(v => v.volume));
        percentChange = ((bestResponseVolume - baseline.volume) / baseline.volume) * 100;
        responseVolume = bestResponseVolume;

      } else if (waterfallType === 'vs_control' && controlGroup && animal.group !== controlGroup) {
        // Change relative to control group mean at selected timepoint
        const controlVolumesAtTimepoint: number[] = [];
        const controlVolumesAtBaseline: number[] = [];
        
        controlAnimalData.forEach(controlVolumes => {
          const controlBaseline = controlVolumes.find(v => v.studyDay === baselineTimepoint);
          let controlResponse = controlVolumes.find(v => v.studyDay === selectedTimepoint);
          if (!controlResponse) {
            // Find closest timepoint for control
            let closestDiff = Infinity;
            controlVolumes.forEach(v => {
              const diff = Math.abs(v.studyDay - selectedTimepoint);
              if (diff < closestDiff) {
                closestDiff = diff;
                controlResponse = v;
              }
            });
          }
          if (controlBaseline && controlResponse) {
            controlVolumesAtBaseline.push(controlBaseline.volume);
            controlVolumesAtTimepoint.push(controlResponse.volume);
          }
        });

        if (controlVolumesAtTimepoint.length > 0 && controlVolumesAtBaseline.length > 0) {
          const controlMeanBaseline = controlVolumesAtBaseline.reduce((sum, v) => sum + v, 0) / controlVolumesAtBaseline.length;
          const controlMeanResponse = controlVolumesAtTimepoint.reduce((sum, v) => sum + v, 0) / controlVolumesAtTimepoint.length;
          const controlChange = ((controlMeanResponse - controlMeanBaseline) / controlMeanBaseline) * 100;
          
          let treatmentResponse = animal.volumes.find(v => v.studyDay === selectedTimepoint);
          if (!treatmentResponse) {
            let closestDiff = Infinity;
            animal.volumes.forEach(v => {
              const diff = Math.abs(v.studyDay - selectedTimepoint);
              if (diff < closestDiff) {
                closestDiff = diff;
                treatmentResponse = v;
              }
            });
          }
          
          if (treatmentResponse) {
            const treatmentChange = ((treatmentResponse.volume - baseline.volume) / baseline.volume) * 100;
            percentChange = treatmentChange - controlChange; // Relative to control
            responseVolume = treatmentResponse.volume;
          }
        }

      } else if (waterfallType === 'vs_control' && animal.group === controlGroup) {
        // Control animals show 0 change when comparing vs control
        percentChange = 0;
        responseVolume = baseline.volume;
      }

      const bestResponseVolume = Math.min(...animal.volumes.map(v => v.volume));

      waterfallResults.push({
        animalId,
        group: animal.group,
        baselineVolume: baseline.volume,
        responseVolume: responseVolume,
        percentChange: percentChange,
        bestResponse: bestResponseVolume
      });
    });

    // Sort by percent change for waterfall effect
    return waterfallResults.sort((a, b) => a.percentChange - b.percentChange);
  }, [data, tumorVolumeColumn, selectedTimepoint, selectedGroupField, waterfallType, baselineTimepoint, controlGroup]);

  // Waterfall plot
  const waterfallPlot = useMemo(() => {
    if (!waterfallData.length) return { traces: [], layout: {} };

    // Sort data by percent change (ascending - most negative first)
    const sortedData = [...waterfallData].sort((a, b) => a.percentChange - b.percentChange);
    
    // Create single trace with all animals colored by group
    const traces: any[] = [{
      x: sortedData.map((_, idx) => idx),
      y: sortedData.map(d => d.percentChange),
      type: 'bar',
      marker: {
        color: sortedData.map(d => colorManager.getColor(d.group)),
        line: { color: 'white', width: 1 },
        opacity: 0.8
      },
      text: sortedData.map(d => d.animalId),
      customdata: sortedData.map(d => [d.group, d.baselineVolume, d.responseVolume, d.bestResponse]),
      hovertemplate: waterfallType === 'timepoint' ? 
        `<b>%{text}</b><br>Group: %{customdata[0]}<br>Day ${selectedTimepoint} Response: %{y:.1f}%<br>Baseline (Day ${baselineTimepoint}): %{customdata[1]:.0f} mm³<br>Day ${selectedTimepoint} Volume: %{customdata[2]:.0f} mm³<br>Best Volume: %{customdata[3]:.0f} mm³<extra></extra>` :
        waterfallType === 'best' ?
        `<b>%{text}</b><br>Group: %{customdata[0]}<br>Best Response: %{y:.1f}%<br>Baseline (Day ${baselineTimepoint}): %{customdata[1]:.0f} mm³<br>Best Volume: %{customdata[3]:.0f} mm³<br>Day ${selectedTimepoint} Volume: %{customdata[2]:.0f} mm³<extra></extra>` :
        `<b>%{text}</b><br>Group: %{customdata[0]}<br>Relative Response: %{y:.1f}%<br>Baseline (Day ${baselineTimepoint}): %{customdata[1]:.0f} mm³<br>Day ${selectedTimepoint} Volume: %{customdata[2]:.0f} mm³<br>Best Volume: %{customdata[3]:.0f} mm³<extra></extra>`,
      showlegend: false
    }];

    // Add zero reference line
    traces.push({
      x: [-0.5, sortedData.length - 0.5],
      y: [0, 0],
      type: 'scatter',
      mode: 'lines',
      line: { color: 'black', width: 2 },
      name: 'No Change (0%)',
      showlegend: false,
      hoverinfo: 'skip'
    });

    // Create legend traces (invisible, just for legend)
    const uniqueGroups = Array.from(new Set(sortedData.map(d => d.group)));
    uniqueGroups.forEach(group => {
      traces.push({
        x: [null],
        y: [null],
        type: 'scatter',
        mode: 'markers',
        marker: { color: colorManager.getColor(group), size: 10 },
        name: group,
        showlegend: true
      });
    });

    // Generate title and axis labels based on waterfall type
    let plotTitle = '';
    let yAxisTitle = '';
    let xAxisTitle = '';
    let hoverTemplate = '';
    
    if (waterfallType === 'timepoint') {
      plotTitle = `Response at Day ${selectedTimepoint} vs Day ${baselineTimepoint} - Waterfall Plot (n=${sortedData.length})`;
      yAxisTitle = `Day ${selectedTimepoint} % Change from Day ${baselineTimepoint}`;
      xAxisTitle = `Individual Animals (ranked by Day ${selectedTimepoint} response)`;
    } else if (waterfallType === 'best') {
      plotTitle = `Best Response vs Day ${baselineTimepoint} - Waterfall Plot (n=${sortedData.length})`;
      yAxisTitle = `Best Response % Change from Day ${baselineTimepoint}`;
      xAxisTitle = `Individual Animals (ranked by best response)`;
    } else if (waterfallType === 'vs_control') {
      plotTitle = `Response vs Control Group at Day ${selectedTimepoint} - Waterfall Plot (n=${sortedData.length})`;
      yAxisTitle = `Day ${selectedTimepoint} Response Relative to Control Group (%)`;
      xAxisTitle = `Individual Animals (ranked by relative response)`;
    }

    const layout = {
      title: { text: plotTitle },
      xaxis: { 
        title: xAxisTitle,
        showticklabels: false,
        showgrid: false,
        zeroline: false,
        range: [-0.5, sortedData.length - 0.5]
      },
      yaxis: { 
        title: yAxisTitle,
        showgrid: true,
        gridcolor: '#f0f0f0',
        gridwidth: 1,
        zeroline: false,
        ticksuffix: '%'
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      hovermode: 'closest',
      legend: {
        x: 1.02,
        y: 1,
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: '#ccc',
        borderwidth: 1
      },
      annotations: [
        {
          x: 0.5,
          y: -0.15,
          xref: 'paper',
          yref: 'paper',
          text: waterfallType === 'timepoint' ? 
            `<i>Note: Waterfall shows individual animal response at Day ${selectedTimepoint} (% change from Day ${baselineTimepoint} baseline).</i>` :
            waterfallType === 'best' ?
            `<i>Note: Waterfall shows individual animal best response (% change from Day ${baselineTimepoint} baseline).</i>` :
            `<i>Note: Waterfall shows individual animal response relative to control group mean response at Day ${selectedTimepoint}.</i>`,
          showarrow: false,
          font: { size: 10, color: '#666' },
          xanchor: 'center'
        }
      ]
    };

    return { traces, layout };
  }, [waterfallData, selectedTimepoint, colorUpdateTrigger]);

  if (!hasTumorVolumeData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" sx={{ mb: 1 }}>
            🔬 TGI Analysis Unavailable
          </Typography>
          <Typography>
            No tumor volume data detected. TGI analysis requires a column named one of: Volume, TumorVolume, Tumor_Volume, volume, or tumor_volume.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3, color: '#8A0051', fontWeight: 600 }}>
        🔬 Tumor Growth Inhibition (TGI) Analysis
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
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
            <FormControl fullWidth>
              <InputLabel>Control Group</InputLabel>
              <Select
                value={controlGroup}
                label="Control Group"
                onChange={(e) => setControlGroup(e.target.value)}
              >
                {availableGroups.map(group => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Analysis Type</InputLabel>
              <Select
                value={analysisType}
                label="Analysis Type"
                onChange={(e) => setAnalysisType(e.target.value as 'overtime' | 'waterfall')}
              >
                <MenuItem value="overtime">TGI Over Time</MenuItem>
                <MenuItem value="waterfall">Waterfall Analysis</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {analysisType === 'waterfall' && (
            <>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Waterfall Type</InputLabel>
                  <Select
                    value={waterfallType}
                    label="Waterfall Type"
                    onChange={(e) => setWaterfallType(e.target.value as 'timepoint' | 'best' | 'vs_control')}
                  >
                    <MenuItem value="timepoint">Response at Timepoint</MenuItem>
                    <MenuItem value="best">Best Response</MenuItem>
                    <MenuItem value="vs_control">Change vs Control Group</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Baseline Timepoint</InputLabel>
                  <Select
                    value={baselineTimepoint}
                    label="Baseline Timepoint"
                    onChange={(e) => setBaselineTimepoint(Number(e.target.value))}
                  >
                    {availableTimepoints.map(day => (
                      <MenuItem key={day} value={day}>Day {day}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {(waterfallType === 'timepoint' || waterfallType === 'vs_control') && (
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Response Timepoint</InputLabel>
                    <Select
                      value={selectedTimepoint}
                      label="Response Timepoint"
                      onChange={(e) => setSelectedTimepoint(Number(e.target.value))}
                    >
                      {availableTimepoints.map(day => (
                        <MenuItem key={day} value={day}>Day {day}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </>
          )}
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
                  variant={group === controlGroup ? 'filled' : 'outlined'}
                  sx={{ 
                    bgcolor: group === controlGroup ? colorManager.getColor(group) : colorManager.getColor(group) + '20', 
                    color: group === controlGroup ? 'white' : colorManager.getColor(group),
                    borderColor: colorManager.getColor(group),
                    fontWeight: 600
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {!controlGroup && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please select a control group to perform TGI analysis.
        </Alert>
      )}

      {/* Plot */}
      {controlGroup && (
        <Box sx={{ 
          width: '100%', 
          overflowX: 'auto',
          '& .plotly': { width: '100% !important' }
        }}>
          {analysisType === 'overtime' ? (
            <>
              <Plot
                data={tgiOverTime.traces}
                layout={{
                  ...tgiOverTime.layout,
                  width: 900,
                  height: 500,
                  margin: { l: 60, r: 60, t: 60, b: 60 }
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'lasso2d']
                }}
              />
              
              {/* Statistical Summary Table */}
              {tgiOverTime.statistics && tgiOverTime.statistics.size > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2, color: '#8A0051' }}>
                    📊 TGI Statistical Analysis Summary
                  </Typography>
                  
                  {Array.from(tgiOverTime.statistics.entries()).map(([group, timepoints]) => (
                    <Box key={group} sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ 
                        mb: 1, 
                        color: colorManager.getColor(group),
                        fontWeight: 600 
                      }}>
                        {group} vs {controlGroup}
                      </Typography>
                      
                      <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Study Day</strong></TableCell>
                              <TableCell align="right"><strong>TGI (%)</strong></TableCell>
                              <TableCell align="right"><strong>SEM</strong></TableCell>
                              <TableCell align="right"><strong>n</strong></TableCell>
                              <TableCell align="right"><strong>p-value</strong></TableCell>
                              <TableCell align="center"><strong>Significance</strong></TableCell>
                              <TableCell align="right"><strong>Treatment Growth (%)</strong></TableCell>
                              <TableCell align="right"><strong>Control Growth (%)</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Array.from(timepoints.entries())
                              .sort(([a], [b]) => a - b)
                              .map(([timepoint, stats]) => (
                                <TableRow 
                                  key={timepoint}
                                  sx={{ 
                                    backgroundColor: stats.pValue < 0.05 ? 
                                      `${colorManager.getColor(group)}20` : 'inherit'
                                  }}
                                >
                                  <TableCell>{timepoint}</TableCell>
                                  <TableCell align="right">{stats.tgi.toFixed(1)}</TableCell>
                                  <TableCell align="right">{stats.tgiSEM.toFixed(1)}</TableCell>
                                  <TableCell align="right">{stats.n}</TableCell>
                                  <TableCell align="right">
                                    {stats.pValue < 0.001 ? '<0.001' : stats.pValue.toFixed(3)}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography sx={{ 
                                      fontWeight: 'bold',
                                      color: stats.pValue < 0.05 ? '#2ca02c' : '#666'
                                    }}>
                                      {stats.significance}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    {stats.treatmentGrowth.toFixed(1)} ± {stats.treatmentGrowthSEM.toFixed(1)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {stats.controlGrowth.toFixed(1)} ± {stats.controlGrowthSEM.toFixed(1)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Statistical Methods:</strong> TGI calculated using individual animal growth rates (Vi/V0-1) 
                      according to PMID:32277094. Statistical significance determined by Welch's t-test comparing 
                      treatment vs control growth rates. *p&lt;0.05, **p&lt;0.01, ***p&lt;0.001.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </>
          ) : (
            <Plot
              data={waterfallPlot.traces}
              layout={{
                ...waterfallPlot.layout,
                width: 900,
                height: 500,
                margin: { l: 60, r: 60, t: 60, b: 100 }
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d']
              }}
            />
          )}
        </Box>
      )}

      {/* Simplified Summary Statistics for Waterfall */}
      {analysisType === 'waterfall' && waterfallData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 2, color: '#8A0051' }}>
            📊 {waterfallType === 'timepoint' ? `Day ${selectedTimepoint}` : 
                 waterfallType === 'best' ? 'Best' : 
                 `Day ${selectedTimepoint} vs Control`} Response Summary by Group
          </Typography>
          
          <Grid container spacing={2}>
            {availableGroups.map(group => {
              const groupData = waterfallData.filter(d => d.group === group);
              if (!groupData.length) return null;

              const responses = groupData.map(d => d.percentChange);
              const mean = responses.reduce((sum, r) => sum + r, 0) / responses.length;
              const median = [...responses].sort((a, b) => a - b)[Math.floor(responses.length / 2)];
              const std = Math.sqrt(responses.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / responses.length);
              const min = Math.min(...responses);
              const max = Math.max(...responses);

              return (
                <Grid item xs={12} md={6} lg={4} key={group}>
                  <Card sx={{ 
                    border: `2px solid ${colorManager.getColor(group)}40`,
                    bgcolor: `${colorManager.getColor(group)}10`
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ 
                        color: colorManager.getColor(group), 
                        mb: 2, 
                        fontWeight: 700,
                        borderBottom: `1px solid ${colorManager.getColor(group)}40`,
                        pb: 1
                      }}>
                        {group}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          📈 Population: {groupData.length} animals
                        </Typography>
                        <Typography variant="body2" sx={{ pl: 1 }}>
                          • Mean: {mean.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ pl: 1 }}>
                          • Median: {median.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ pl: 1 }}>
                          • SD: {std.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ pl: 1 }}>
                          • Range: {min.toFixed(1)}% to {max.toFixed(1)}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default TGIAnalysis;