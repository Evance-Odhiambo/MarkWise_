import { useState, useEffect } from 'react';
import { useWindowDimensions, ScaledSize } from 'react-native';
import { breakpoints, BreakpointKey, getScreenSize, ScreenSize } from '../utils/breakpoints';

interface ResponsiveState {
  width: number;
  height: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isSmallMobile: boolean;
  screenSize: ScreenSize;
  isPortrait: boolean;
  isLandscape: boolean;
  lessThan: (key: BreakpointKey) => boolean;
  greaterThan: (key: BreakpointKey) => boolean;
  between: (min: BreakpointKey, max: BreakpointKey) => boolean;
}

export const useResponsive = (): ResponsiveState => {
  const { width, height } = useWindowDimensions() as ScaledSize & {
    isLandscape: boolean;
  };

  const screenSize = getScreenSize(width);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width,
    height,
  });

  useEffect(() => {
    setDimensions({ width, height });
  }, [width, height]);

  const lessThan = (key: BreakpointKey): boolean => {
    return dimensions.width < breakpoints[key];
  };

  const greaterThan = (key: BreakpointKey): boolean => {
    return dimensions.width >= breakpoints[key];
  };

  const between = (min: BreakpointKey, max: BreakpointKey): boolean => {
    return dimensions.width >= breakpoints[min] && dimensions.width < breakpoints[max];
  };

  return {
    width: dimensions.width,
    height: dimensions.height,
    isDesktop: dimensions.width >= breakpoints.xl,
    isTablet: between('lg', 'xl'),
    isMobile: dimensions.width < breakpoints.lg,
    isSmallMobile: dimensions.width < breakpoints.sm,
    screenSize,
    isPortrait: dimensions.height >= dimensions.width,
    isLandscape: dimensions.width > dimensions.height,
    lessThan,
    greaterThan,
    between,
  };
};

export const {
  sm,
  md,
  lg,
  xl,
  xl2,
} = breakpoints;
