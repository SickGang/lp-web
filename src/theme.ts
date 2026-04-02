import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  colors: {
    lp: {
      bg: '#17181C',
      surface: '#2C2C2E',
      input: '#27292D',
      border: '#3A3A3C',
      textPrimary: '#FFFFFF',
      textSecondary: '#CCCCCC',
      textMuted: '#8E8E93',
      whiteButton: '#FFFFFF',
      blackText: '#000000',
      accent: '#0088CC',
      error: '#FF3B30',
      warning: '#FFD700',
      success: '#4CAF50',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'lp.bg',
        color: 'lp.textPrimary',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '12px',
        fontWeight: 600,
      },
      variants: {
        solid: {
          bg: 'lp.whiteButton',
          color: 'lp.blackText',
          _hover: {
            bg: '#ECECEC',
          },
        },
        outline: {
          bg: 'transparent',
          borderColor: 'lp.border',
          color: 'lp.textPrimary',
          _hover: {
            bg: 'lp.input',
            borderColor: 'lp.textMuted',
          },
        },
        ghost: {
          color: 'lp.textSecondary',
          _hover: {
            bg: 'lp.input',
            color: 'lp.textPrimary',
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'lp.input',
            borderColor: 'lp.border',
            color: 'lp.textPrimary',
            _placeholder: {
              color: 'lp.textMuted',
            },
            _hover: {
              borderColor: 'lp.textMuted',
            },
            _focusVisible: {
              borderColor: 'lp.textSecondary',
              boxShadow: 'none',
            },
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'lp.input',
            borderColor: 'lp.border',
            color: 'lp.textPrimary',
            _hover: {
              borderColor: 'lp.textMuted',
            },
            _focusVisible: {
              borderColor: 'lp.textSecondary',
              boxShadow: 'none',
            },
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'lp.surface',
          borderRadius: '16px',
          borderWidth: '1px',
          borderColor: 'lp.border',
        },
      },
    },
  },
});

export default theme;
