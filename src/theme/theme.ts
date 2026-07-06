import { createTheme, alpha, type Theme } from '@mui/material/styles';

// Light theme — matches construction.pen $--variable tokens (3rd iteration)
export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2B2D42', // $--primary
      light: '#4A4D6A',
      dark: '#1A1C2B',
      contrastText: '#FFFFFF', // $--primary-foreground
    },
    secondary: {
      main: '#F0F0F3', // $--secondary (subtle bg)
      light: '#F8F8FB',
      dark: '#D9DBE1',
    },
    error: {
      main: '#DC2626', // aligned with --status-red — single destructive red app-wide
      light: '#EF4444',
      dark: '#B91C1C',
      contrastText: '#FFFFFF', // --destructive-foreground
    },
    warning: {
      main: '#8B6914', // $--color-warning-foreground
      light: '#A87E1A',
      dark: '#6E5210',
    },
    info: {
      // Blue-700 family — distinct from the navy primary, same hue family as
      // dark mode's info and status.completed. Passes AA at 10px on badgeBg.
      main: '#1D4ED8',
      light: '#3B82F6',
      dark: '#1E40AF',
    },
    success: {
      main: '#3D6B4F', // $--color-success-foreground
      light: '#4F8A65',
      dark: '#2A4C38',
    },
    background: {
      default: '#f7f8f8', // Linear light bg
      paper: '#FFFFFF',   // $--card
    },
    text: {
      primary: '#1A1A2E',
      // Linear's #8a8f98 fails WCAG AA against light backgrounds (~2.9:1).
      // Use Tailwind gray-500 for ~4.3:1 in light. Dark mode keeps #8a8f98.
      secondary: '#6b7280',
      disabled: '#62666d',
    },
    divider: '#e6e6e6', // Linear light border
    action: {
      hover: 'rgba(0,0,0,0.02)',        // Linear ghost background
      selected: 'rgba(43, 45, 66, 0.08)',
      disabled: '#e6e6e6',
    },
  },
  typography: {
    // Geist for body/UI, JetBrains Mono reserved for code/tabular/technical labels.
    fontFamily:
      'var(--font-geist-sans), "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    // Linear's three-tier weight system: 400 (body), 510 (UI/emphasis), 590 (headings)
    fontWeightRegular: 400,
    fontWeightMedium: 510,
    fontWeightBold: 590,
    h1: { fontSize: '2rem', fontWeight: 590, lineHeight: 1.13, letterSpacing: '-0.704px' },
    h2: { fontSize: '1.5rem', fontWeight: 590, lineHeight: 1.33, letterSpacing: '-0.288px' },
    h3: { fontSize: '1.25rem', fontWeight: 590, lineHeight: 1.33, letterSpacing: '-0.24px' },
    h4: { fontSize: '1.125rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.2px' },
    h5: { fontSize: '1rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.165px' },
    h6: { fontSize: '0.875rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.1px' },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 510, lineHeight: 1.5, letterSpacing: '-0.165px' },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 510, lineHeight: 1.5, letterSpacing: '-0.13px' },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '-0.13px' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    overline: { fontSize: '0.6875rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '0.12em', textTransform: 'uppercase' },
    button: { fontSize: '0.8125rem', fontWeight: 510, letterSpacing: 'normal', textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f7f8f8',
          color: '#1A1A2E',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&.Mui-disabled': {
            backgroundColor: '#D9DBE1',
            color: '#8D99AE',
            opacity: 0.7,
          },
          '& .MuiButton-startIcon svg, & .MuiButton-endIcon svg': { width: 16, height: 16 },
          '&.MuiButton-sizeLarge .MuiButton-startIcon svg, &.MuiButton-sizeLarge .MuiButton-endIcon svg': { width: 18, height: 18 },
          '&.MuiButton-sizeSmall .MuiButton-startIcon svg, &.MuiButton-sizeSmall .MuiButton-endIcon svg': { width: 14, height: 14 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: 'box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
            transition: 'border-color 0.15s ease',
          },
          '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.32),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`,
          },
        }),
      },
    },
  },
});

// Extend theme with custom properties
declare module '@mui/material/styles' {
  interface Palette {
    card: {
      background: string;
    };
    input: {
      background: string;
    };
    sidebar: {
      background: string;
      border: string;
      indicator: string;
      activeBg: string;
      hoverBg: string;
      activeItemBg: string;
    };
    accent: {
      dark: string;
      gradientEnd: string;
    };
    status: {
      active: string;
      inProgress: string;
      onHold: string;
      completed: string;
      archived: string;
      activeBg: string;
      activeText: string;
      inProgressBg: string;
      inProgressText: string;
    };
    warm: {
      main: string;
      dark: string;
      contrastText: string;
      subtle: string;
    };
    grid: {
      line: string;
    };
    timeline: {
      accent: string;
      accentSubtle: string;
    };
    docExplorer: {
      destructiveMain: string;
      destructiveDark: string;
      destructiveLight: string;
      linkedGreen: string;
      badgeBg: string;
      aiPurple: string;
    };
  }
  interface PaletteOptions {
    card?: {
      background?: string;
    };
    input?: {
      background?: string;
    };
    sidebar?: {
      background?: string;
      border?: string;
      indicator?: string;
      activeBg?: string;
      hoverBg?: string;
      activeItemBg?: string;
    };
    accent?: {
      dark?: string;
      gradientEnd?: string;
    };
    status?: {
      active?: string;
      inProgress?: string;
      onHold?: string;
      completed?: string;
      archived?: string;
      activeBg?: string;
      activeText?: string;
      inProgressBg?: string;
      inProgressText?: string;
    };
    warm?: {
      main?: string;
      dark?: string;
      contrastText?: string;
      subtle?: string;
    };
    grid?: {
      line?: string;
    };
    timeline?: {
      accent?: string;
      accentSubtle?: string;
    };
    docExplorer?: {
      destructiveMain?: string;
      destructiveDark?: string;
      destructiveLight?: string;
      linkedGreen?: string;
      badgeBg?: string;
      aiPurple?: string;
    };
  }
}

// Add custom properties to light theme
lightTheme.palette.card = {
  background: '#FFFFFF', // $--card
};
lightTheme.palette.input = {
  background: '#D9DBE1', // $--input
};
lightTheme.palette.sidebar = {
  background: '#FFFFFF',   // $--sidebar
  border: '#D9DBE1',       // $--sidebar-border
  indicator: '#d97706',    // active bar — signature amber accent
  activeBg: '#FFFFFF',     // $--card
  hoverBg: '#F0F0F3',      // $--sidebar-accent
  activeItemBg: 'rgba(217, 119, 6, 0.1)', // amber wash — matches --accent-warm-subtle
};
lightTheme.palette.accent = {
  dark: '#2B2D42',       // $--primary (dark navy)
  gradientEnd: '#1A1C2B',
};
lightTheme.palette.status = {
  active: '#22C55E',
  inProgress: '#F59E0B',
  onHold: '#8D99AE',
  completed: '#3B82F6',
  archived: '#8D99AE',
  activeBg: '#dcfce7',
  activeText: '#166534',
  inProgressBg: '#fef3c7',
  inProgressText: '#92400e',
};
lightTheme.palette.warm = {
  main: '#d97706', // amber, matching --accent-warm — the app's signature accent
  dark: '#b45309',
  contrastText: '#FFFFFF',
  subtle: 'rgba(217, 119, 6, 0.1)',
};
lightTheme.palette.grid = {
  line: 'rgba(0, 0, 0, 0.04)',
};
lightTheme.palette.timeline = {
  accent: '#2B2D42',              // $--primary
  accentSubtle: 'rgba(43, 45, 66, 0.08)',
};
lightTheme.palette.docExplorer = {
  // Destructive shades share the error red family (was a one-off maroon)
  destructiveMain: '#DC2626',
  destructiveDark: '#B91C1C',
  destructiveLight: '#FEE2E2',
  linkedGreen: '#059669',
  badgeBg: '#DFDFE6',
  aiPurple: '#A855F7',
};

// Dark theme — Linear-inspired dark surfaces + navy lifted to a lighter variant for contrast.
export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4A4D6A',     // lighter navy so it reads on dark
      light: '#6B6F8D',
      dark: '#2B2D42',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#191a1b',
      light: '#28282c',
      dark: '#0f1011',
    },
    error: {
      main: '#F87171',
      light: '#FCA5A5',
      dark: '#DC2626',
      contrastText: '#0f1011',
    },
    warning: {
      main: '#FBBF24',
      light: '#FCD34D',
      dark: '#D97706',
    },
    info: {
      // Blue-400 family — same hue as light mode's info (luminance-flipped,
      // not hue-flipped, per the theme parity rules).
      main: '#60A5FA',
      light: '#93C5FD',
      dark: '#3B82F6',
    },
    success: {
      main: '#34D399',
      light: '#6EE7B7',
      dark: '#10B981',
    },
    background: {
      default: '#0f1011', // Linear panel dark
      paper: '#191a1b',   // Linear level 3 surface
    },
    text: {
      primary: '#f7f8f8',
      secondary: '#8a8f98',
      disabled: '#62666d',
    },
    divider: 'rgba(255,255,255,0.08)',
    action: {
      hover: 'rgba(255,255,255,0.04)',
      selected: 'rgba(255,255,255,0.06)',
      disabled: 'rgba(255,255,255,0.08)',
    },
  },
  typography: {
    fontFamily:
      'var(--font-geist-sans), "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 510,
    fontWeightBold: 590,
    h1: { fontSize: '2rem', fontWeight: 590, lineHeight: 1.13, letterSpacing: '-0.704px' },
    h2: { fontSize: '1.5rem', fontWeight: 590, lineHeight: 1.33, letterSpacing: '-0.288px' },
    h3: { fontSize: '1.25rem', fontWeight: 590, lineHeight: 1.33, letterSpacing: '-0.24px' },
    h4: { fontSize: '1.125rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.2px' },
    h5: { fontSize: '1rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.165px' },
    h6: { fontSize: '0.875rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '-0.1px' },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 510, lineHeight: 1.5, letterSpacing: '-0.165px' },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 510, lineHeight: 1.5, letterSpacing: '-0.13px' },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '-0.13px' },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    overline: { fontSize: '0.6875rem', fontWeight: 590, lineHeight: 1.4, letterSpacing: '0.12em', textTransform: 'uppercase' },
    button: { fontSize: '0.8125rem', fontWeight: 510, letterSpacing: 'normal', textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f1011',
          color: '#f7f8f8',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: '#62666d',
            opacity: 0.7,
          },
          '& .MuiButton-startIcon svg, & .MuiButton-endIcon svg': { width: 16, height: 16 },
          '&.MuiButton-sizeLarge .MuiButton-startIcon svg, &.MuiButton-sizeLarge .MuiButton-endIcon svg': { width: 18, height: 18 },
          '&.MuiButton-sizeSmall .MuiButton-startIcon svg, &.MuiButton-sizeSmall .MuiButton-endIcon svg': { width: 14, height: 14 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: 'box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
            transition: 'border-color 0.15s ease',
          },
          '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.32),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`,
          },
        }),
      },
    },
  },
});

darkTheme.palette.card = {
  background: '#191a1b',
};
darkTheme.palette.input = {
  background: 'rgba(255,255,255,0.04)',
};
darkTheme.palette.sidebar = {
  // Sidebar sits one step deeper than main content so it visually recedes
  // and the main work area lifts — mirrors light mode where sidebar is the
  // brighter surface above main. Three-tier dark stack: sidebar #08090a <
  // main #0f1011 < cards/paper #191a1b.
  background: '#08090a',
  border: 'rgba(255,255,255,0.08)',
  indicator: '#F59E0B',    // signature amber — matches --sidebar-indicator dark value
  activeBg: '#191a1b',
  hoverBg: 'rgba(255,255,255,0.04)',
  activeItemBg: 'rgba(245, 158, 11, 0.14)', // amber wash — matches --accent-warm-subtle
};
darkTheme.palette.accent = {
  dark: '#f7f8f8',
  gradientEnd: '#d0d6e0',
};
darkTheme.palette.status = {
  active: '#22C55E',
  inProgress: '#F59E0B',
  onHold: '#8D99AE',
  completed: '#3B82F6',
  archived: '#8D99AE',
  activeBg: 'rgba(34,197,94,0.15)',
  activeText: '#4ade80',
  inProgressBg: 'rgba(245,158,11,0.15)',
  inProgressText: '#fbbf24',
};
darkTheme.palette.warm = {
  main: '#F59E0B',
  dark: '#D97706',
  contrastText: '#0f1011',
  subtle: 'rgba(245, 158, 11, 0.14)',
};
darkTheme.palette.grid = {
  line: 'rgba(255,255,255,0.06)',
};
darkTheme.palette.timeline = {
  accent: '#f7f8f8',
  accentSubtle: 'rgba(255,255,255,0.06)',
};
darkTheme.palette.docExplorer = {
  destructiveMain: '#f87171',
  destructiveDark: '#ef4444',
  destructiveLight: 'rgba(239,68,68,0.12)',
  linkedGreen: '#34d399',
  badgeBg: 'rgba(255,255,255,0.08)',
  aiPurple: '#c084fc',
};

