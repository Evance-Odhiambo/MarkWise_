export const breakpoints = {
  sm: 360,
  md: 480,
  lg: 768,
  xl: 1024,
  xl2: 1280,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl' | 'xl2' | 'xs';

export const getScreenSize = (width: number): ScreenSize => {
  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints.xl2) return 'xl';
  return 'xl2';
};
