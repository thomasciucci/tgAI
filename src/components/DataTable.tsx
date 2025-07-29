import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, Typography } from '@mui/material';

interface DataTableProps {
  data: Record<string, any>[];
  availableParameters: string[];
  selectedParameter: string;
  onParameterChange: (param: string) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, availableParameters, selectedParameter, onParameterChange }) => {

  if (!data || data.length === 0) {
    return <div>No data to display.</div>;
  }

  // Get all unique animal IDs
  const animals = Array.from(new Set(data.map(row => row.animalId)));
  // Get all unique timepoints, sorted numerically
  const timepoints = Array.from(new Set(data.map(row => row.studyDay))).sort((a, b) => Number(a) - Number(b));

  // Build a lookup: animalId -> { timepoint -> value }
  const animalMap: Record<string, { group?: string; [day: string]: any }> = {};
  data.forEach(row => {
    if (!animalMap[row.animalId]) {
      animalMap[row.animalId] = { group: row.group };
    }
    animalMap[row.animalId][row.studyDay] = row[selectedParameter];
  });


  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={selectedParameter}
          onChange={(_, val) => onParameterChange(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: '#8A0051 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8A0051',
            },
          }}
        >
          {availableParameters.map(param => (
            <Tab key={param} label={param} value={param} />
          ))}
        </Tabs>
      </Box>
      
      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Animal ID</TableCell>
              <TableCell>Group</TableCell>
              {timepoints.map(day => (
                <TableCell key={day}>Day {day}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {animals.map(animalId => (
              <TableRow key={animalId}>
                <TableCell>{animalId}</TableCell>
                <TableCell>{animalMap[animalId]?.group || '-'}</TableCell>
                {timepoints.map(day => (
                  <TableCell key={day}>
                    {animalMap[animalId][day] !== undefined && animalMap[animalId][day] !== null && animalMap[animalId][day] !== ''
                      ? animalMap[animalId][day]
                      : <Typography color="text.secondary">NA</Typography>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DataTable; 