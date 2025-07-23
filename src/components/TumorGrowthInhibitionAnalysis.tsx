import React, { useState, useMemo } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody, Grid } from '@mui/material';
import Plot from 'react-plotly.js';
import { TumorStatisticalAnalysis } from '../utils/TumorStatisticalAnalysis';
import type { AnimalDataManager } from '../utils/AnimalDataManager';

interface TumorGrowthInhibitionAnalysisProps {
  dataManager: AnimalDataManager;
  studyId: string;
}

const TumorGrowthInhibitionAnalysis: React.FC<TumorGrowthInhibitionAnalysisProps> = ({ dataManager, studyId }) => {
  const [endpointDay, setEndpointDay] = useState<number>(21);
  const [controlGroup, setControlGroup] = useState<string>('Control');
  const [statisticalTest, setStatisticalTest] = useState<'ttest' | 'mannwhitney' | 'both'>('ttest');

  const animals = useMemo(() => dataManager.getStudyAnimals(studyId), [dataManager, studyId]);
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {};
    animals.forEach(a => {
      if (!g[a.group]) g[a.group] = [];
      g[a.group].push(a);
    });
    return g;
  }, [animals]);
  const groupNames = Object.keys(groups);

  // Get all timepoints
  const allTimepoints = useMemo(() => {
    const set = new Set<number>();
    animals.forEach(a => a.measurements.forEach(m => set.add(m.studyDay)));
    return Array.from(set).sort((a, b) => a - b);
  }, [animals]);

  // Run analysis
  const analysis = useMemo(() => {
    if (!groups[controlGroup]) return null;
    const tsa = new TumorStatisticalAnalysis();
    const control = groups[controlGroup];
    const treatments = groupNames.filter(g => g !== controlGroup).map(name => ({ name, animals: groups[name] }));
    return tsa.calculateAdvancedTGI(control, treatments, allTimepoints);
  }, [groups, controlGroup, groupNames, allTimepoints]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.timepoints.map(tp => {
      const obj: any = { day: tp.day, control: tp.controlStats.mean };
      tp.treatments.forEach(t => {
        obj[t.treatmentName] = t.treatmentMean;
      });
      return obj;
    });
  }, [analysis]);

  // Prepare TGI summary for endpoint
  const tgiSummary = useMemo(() => {
    if (!analysis) return [];
    const endpoint = analysis.timepoints.find(tp => tp.day === endpointDay);
    if (!endpoint) return [];
    return endpoint.treatments.map(t => ({
      treatment: t.treatmentName,
      tgi: t.tgi,
      tgiCI: t.tgiCI,
      pValue: t.tTest.pValue,
      cohensD: t.cohensD,
      interpretation: t.interpretation,
      nAnimals: t.n_treatment
    }));
  }, [analysis, endpointDay]);

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>Tumor Growth Inhibition (TGI) Analysis</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Control Group</InputLabel>
          <Select value={controlGroup} label="Control Group" onChange={e => setControlGroup(e.target.value)}>
            {groupNames.map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Endpoint Day</InputLabel>
          <Select value={endpointDay} label="Endpoint Day" onChange={e => setEndpointDay(Number(e.target.value))}>
            {allTimepoints.map(day => (
              <MenuItem key={day} value={day}>{day}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Statistical Test</InputLabel>
          <Select value={statisticalTest} label="Statistical Test" onChange={e => setStatisticalTest(e.target.value as any)}>
            <MenuItem value="ttest">t-test</MenuItem>
            <MenuItem value="mannwhitney">Mann-Whitney U</MenuItem>
            <MenuItem value="both">Both</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1">Tumor Growth Curves</Typography>
          <Plot
            data={[
              {
                x: chartData.map(d => d.day),
                y: chartData.map(d => d.control),
                type: 'scatter',
                mode: 'lines+markers',
                name: controlGroup,
                line: { color: '#000', width: 3 }
              },
              ...groupNames.filter(g => g !== controlGroup).map((name, idx) => ({
                x: chartData.map(d => d.day),
                y: chartData.map(d => d[name]),
                type: 'scatter',
                mode: 'lines+markers',
                name,
                line: { color: `hsl(${idx * 60 + 120}, 70%, 50%)`, width: 2 }
              }))
            ] as any}
            layout={{
              width: 600,
              height: 400,
              title: { text: 'Tumor Growth Curves' },
              xaxis: { title: { text: 'Study Day' } },
              yaxis: { title: { text: 'Tumor Volume' } }
            }}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1">TGI Summary (Day {endpointDay})</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Treatment</TableCell>
                <TableCell>N</TableCell>
                <TableCell>TGI (%)</TableCell>
                <TableCell>95% CI</TableCell>
                <TableCell>p-value</TableCell>
                <TableCell>Cohen's d</TableCell>
                <TableCell>Efficacy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tgiSummary.map((row, idx) => (
                <TableRow key={idx} sx={{ background: row.pValue < 0.05 ? '#e0f7fa' : undefined }}>
                  <TableCell>{row.treatment}</TableCell>
                  <TableCell>{row.nAnimals}</TableCell>
                  <TableCell>{row.tgi.toFixed(1)}</TableCell>
                  <TableCell>
                    [{row.tgiCI.lower.toFixed(1)}, {row.tgiCI.upper.toFixed(1)}]
                  </TableCell>
                  <TableCell>{row.pValue < 0.001 ? '<0.001' : row.pValue.toFixed(3)}</TableCell>
                  <TableCell>{row.cohensD.toFixed(2)}</TableCell>
                  <TableCell>{row.interpretation.efficacy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default TumorGrowthInhibitionAnalysis; 