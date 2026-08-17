import { useTheme } from '../context/ThemeContext';
import { ColorPalette } from '../context/ThemeContext';

export const useThemeColors = (): ColorPalette => {
  const { colors } = useTheme();
  return colors;
};

export { useTheme };
export { useResponsive } from './useResponsive';
export type { BreakpointKey, ScreenSize } from '../utils/breakpoints';
