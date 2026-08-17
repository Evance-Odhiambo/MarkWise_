export type { Theme, ColorPalette } from '../context/ThemeContext';

export type StatusColor = 'success' | 'warning' | 'error' | 'info';

export const statusColors: Record<StatusColor, { light: string; dark: string }> = {
  success: { light: '#10b981', dark: '#34d399' },
  warning: { light: '#f59e0b', dark: '#fbbf24' },
  error: { light: '#ef4444', dark: '#f87171' },
  info: { light: '#3b82f6', dark: '#60a5fa' },
};
