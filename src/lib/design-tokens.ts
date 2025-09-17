/**
 * Design Tokens for Knowledge Network React Application
 *
 * Comprehensive design token system providing consistent values across
 * the entire application for colors, typography, spacing, and more.
 */

// Color System
export const colors = {
  // Primary brand colors
  primary: {
    50: 'hsl(261, 85%, 95%)',
    100: 'hsl(261, 85%, 90%)',
    200: 'hsl(261, 85%, 80%)',
    300: 'hsl(261, 85%, 70%)',
    400: 'hsl(261, 85%, 60%)',
    500: 'hsl(262, 83%, 58%)', // Primary brand color
    600: 'hsl(263, 70%, 50%)',
    700: 'hsl(264, 65%, 45%)',
    800: 'hsl(265, 60%, 40%)',
    900: 'hsl(266, 55%, 35%)',
    950: 'hsl(267, 50%, 25%)',
  },

  // Secondary accent colors
  secondary: {
    50: 'hsl(220, 43%, 98%)',
    100: 'hsl(220, 43%, 95%)',
    200: 'hsl(220, 43%, 89%)',
    300: 'hsl(220, 43%, 80%)',
    400: 'hsl(220, 43%, 70%)',
    500: 'hsl(220, 39%, 60%)',
    600: 'hsl(220, 39%, 50%)',
    700: 'hsl(220, 39%, 40%)',
    800: 'hsl(220, 39%, 30%)',
    900: 'hsl(220, 39%, 20%)',
    950: 'hsl(220, 39%, 11%)',
  },

  // Neutral grays
  neutral: {
    50: 'hsl(210, 20%, 98%)',
    100: 'hsl(210, 20%, 95%)',
    200: 'hsl(210, 16%, 93%)',
    300: 'hsl(210, 14%, 89%)',
    400: 'hsl(210, 14%, 83%)',
    500: 'hsl(210, 11%, 71%)',
    600: 'hsl(210, 9%, 64%)',
    700: 'hsl(210, 10%, 57%)',
    800: 'hsl(210, 10%, 46%)',
    900: 'hsl(210, 11%, 30%)',
    950: 'hsl(210, 13%, 18%)',
  },

  // Semantic colors
  success: {
    50: 'hsl(142, 76%, 95%)',
    100: 'hsl(142, 76%, 90%)',
    200: 'hsl(142, 76%, 80%)',
    300: 'hsl(142, 76%, 70%)',
    400: 'hsl(142, 76%, 60%)',
    500: 'hsl(142, 76%, 50%)',
    600: 'hsl(142, 76%, 45%)',
    700: 'hsl(142, 76%, 40%)',
    800: 'hsl(142, 76%, 35%)',
    900: 'hsl(142, 76%, 30%)',
    950: 'hsl(142, 76%, 20%)',
  },

  warning: {
    50: 'hsl(48, 96%, 95%)',
    100: 'hsl(48, 96%, 90%)',
    200: 'hsl(48, 96%, 80%)',
    300: 'hsl(48, 96%, 70%)',
    400: 'hsl(48, 96%, 60%)',
    500: 'hsl(48, 96%, 50%)',
    600: 'hsl(42, 87%, 55%)',
    700: 'hsl(36, 77%, 49%)',
    800: 'hsl(32, 74%, 44%)',
    900: 'hsl(28, 70%, 40%)',
    950: 'hsl(24, 65%, 30%)',
  },

  error: {
    50: 'hsl(0, 86%, 97%)',
    100: 'hsl(0, 93%, 94%)',
    200: 'hsl(0, 96%, 89%)',
    300: 'hsl(0, 94%, 82%)',
    400: 'hsl(0, 91%, 71%)',
    500: 'hsl(0, 84%, 60%)',
    600: 'hsl(0, 72%, 51%)',
    700: 'hsl(0, 74%, 42%)',
    800: 'hsl(0, 70%, 35%)',
    900: 'hsl(0, 63%, 31%)',
    950: 'hsl(0, 75%, 15%)',
  },

  info: {
    50: 'hsl(204, 100%, 97%)',
    100: 'hsl(204, 94%, 94%)',
    200: 'hsl(201, 94%, 86%)',
    300: 'hsl(199, 95%, 74%)',
    400: 'hsl(198, 93%, 60%)',
    500: 'hsl(198, 93%, 50%)',
    600: 'hsl(200, 98%, 39%)',
    700: 'hsl(201, 96%, 32%)',
    800: 'hsl(201, 90%, 27%)',
    900: 'hsl(202, 80%, 24%)',
    950: 'hsl(202, 80%, 16%)',
  },
} as const

// Typography System
export const typography = {
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
    display: ['Cal Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],     // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],        // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],     // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],      // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
    '5xl': ['3rem', { lineHeight: '1' }],            // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],         // 60px
    '7xl': ['4.5rem', { lineHeight: '1' }],          // 72px
    '8xl': ['6rem', { lineHeight: '1' }],            // 96px
    '9xl': ['8rem', { lineHeight: '1' }],            // 128px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const

// Spacing System (8pt grid)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem',       // 384px
} as const

// Shadow System
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Colored shadows for primary elements
  'primary-sm': '0 1px 2px 0 hsl(262 83% 58% / 0.2)',
  'primary-md': '0 4px 6px -1px hsl(262 83% 58% / 0.2), 0 2px 4px -2px hsl(262 83% 58% / 0.1)',
  'primary-lg': '0 10px 15px -3px hsl(262 83% 58% / 0.2), 0 4px 6px -4px hsl(262 83% 58% / 0.1)',
} as const

// Border Radius System
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const

// Z-index System
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',

  // Semantic z-index values
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  'modal-backdrop': '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  toast: '1080',
} as const

// Animation & Transition System
export const animation = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom easing curves
    'ease-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'ease-snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  keyframes: {
    'fade-in': {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    'fade-out': {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
    'slide-in-up': {
      '0%': { transform: 'translateY(100%)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-in-down': {
      '0%': { transform: 'translateY(-100%)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-in-left': {
      '0%': { transform: 'translateX(-100%)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    'slide-in-right': {
      '0%': { transform: 'translateX(100%)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    'scale-in': {
      '0%': { transform: 'scale(0.9)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    'scale-out': {
      '0%': { transform: 'scale(1)', opacity: '1' },
      '100%': { transform: 'scale(0.9)', opacity: '0' },
    },
    'bounce-in': {
      '0%': { transform: 'scale(0.3)', opacity: '0' },
      '50%': { transform: 'scale(1.05)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    'shake': {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
    },
    'pulse': {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    'spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
} as const

// Breakpoint System
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '56px',
    },
    padding: {
      sm: '8px 12px',
      md: '12px 16px',
      lg: '16px 24px',
      xl: '20px 32px',
    },
  },

  input: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      sm: '8px 12px',
      md: '12px 16px',
      lg: '16px 20px',
    },
  },

  card: {
    padding: {
      sm: '16px',
      md: '24px',
      lg: '32px',
      xl: '40px',
    },
  },

  modal: {
    width: {
      sm: '384px',
      md: '512px',
      lg: '768px',
      xl: '1024px',
    },
  },
} as const

// Export all tokens as a unified design system
export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  zIndex,
  animation,
  breakpoints,
  components,
} as const

export type DesignTokens = typeof designTokens
export type ColorScale = typeof colors.primary
export type SpacingScale = typeof spacing
export type TypographyScale = typeof typography.fontSize