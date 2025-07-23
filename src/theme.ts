import { createTheme } from '@mui/material/styles';

// Color palette based on #8a0051
const colorPalette = {
  primary: {
    main: '#8A0051', // Base color
    light: '#B8006B', // Lighter shade
    dark: '#5C0037', // Darker shade
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#D966A3', // Light pink complement
    light: '#E699C2', // Very light pink
    dark: '#B8347A', // Dark pink
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FDF9FC', // Very light pink tint
    paper: '#FFFFFF',
  },
  grey: {
    50: '#FDF9FC',
    100: '#F9ECEF',
    200: '#EFCCDB',
    300: '#E5ABC7',
    400: '#DB8AB3',
    500: '#D1699F',
    600: '#B8558A',
    700: '#9F4075',
    800: '#862B60',
    900: '#6D164B',
  },
};

export const burgundyTheme = createTheme({
  palette: {
    ...colorPalette,
    error: {
      main: '#D32F2F',
    },
    warning: {
      main: '#ED6C02',
    },
    info: {
      main: '#0288D1',
    },
    success: {
      main: '#2E7D32',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#8A0051',
    },
    h6: {
      fontWeight: 500,
      color: '#8A0051',
    },
    subtitle1: {
      color: '#5C0037',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&.MuiPaper-elevation3': {
            boxShadow: '0 4px 20px rgba(138, 0, 81, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          background: 'linear-gradient(135deg, #8A0051 0%, #B8006B 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5C0037 0%, #8A0051 100%)',
          },
        },
        outlined: {
          borderColor: '#8A0051',
          color: '#8A0051',
          '&:hover': {
            backgroundColor: 'rgba(138, 0, 81, 0.04)',
            borderColor: '#5C0037',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: '#8A0051',
            height: 3,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            color: '#8A0051',
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#FDF9FC',
            color: '#8A0051',
            fontWeight: 600,
            borderBottom: '2px solid #EFCCDB',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(even)': {
            backgroundColor: '#FDF9FC',
          },
          '&:hover': {
            backgroundColor: '#F9ECEF !important',
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#8A0051',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#8A0051',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: '#8A0051',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardInfo: {
          backgroundColor: '#F9ECEF',
          color: '#5C0037',
          '& .MuiAlert-icon': {
            color: '#8A0051',
          },
        },
      },
    },
  },
});