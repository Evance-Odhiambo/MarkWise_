import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

export interface ColorPalette {
  primary: string;
  primaryHover: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
}

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

export interface ThemeContextType {
  theme: Theme;
  colors: ColorPalette;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    if (systemScheme) {
      setTheme(systemScheme);
    }
  }, [systemScheme]);

  const colors = useMemo(
    () => (theme === 'dark' ? darkPalette : lightPalette),
    [theme],
  );

  const value = useMemo(
    () => ({
      theme,
      colors,
      isDark: theme === 'dark',
      toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
