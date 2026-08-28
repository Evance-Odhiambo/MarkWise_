import { ColorPalette, Theme } from '../context/ThemeContext';

export const getColorsForTheme = (theme: Theme): ColorPalette => {
  const lightPalette: ColorPalette = {
    primary: '#10b981',
    primaryHover: '#059669',
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
    border: '#e5e7eb',
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
  };

  const darkPalette: ColorPalette = {
    primary: '#34d399',
    primaryHover: '#6ee7b7',
    surface: '#0f172a',
    surfaceAlt: '#1e293b',
    border: '#334159',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64a5cf',
  };

  return theme === 'dark' ? darkPalette : lightPalette;
};

export const getStatusColor = (
  status: 'success' | 'warning' | 'error' | 'info',
  theme: Theme,
): string => {
  const colors: Record<Theme, Record<typeof status, string>> = {
    light: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    dark: {
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
    },
  };
  return colors[theme][status];
};
