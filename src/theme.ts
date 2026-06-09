import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  semanticTokens: {
    colors: {
      'lp.bg': { default: '#F5F5F7', _dark: '#17181C' },
      'lp.surface': { default: '#FFFFFF', _dark: '#2C2C2E' },
      'lp.input': { default: '#EFEFF4', _dark: '#27292D' },
      'lp.border': { default: '#E5E5EA', _dark: '#3A3A3C' },
      'lp.textPrimary': { default: '#1C1C1E', _dark: '#FFFFFF' },
      'lp.textSecondary': { default: '#3A3A3C', _dark: '#CCCCCC' },
      'lp.textMuted': { default: '#8E8E93', _dark: '#8E8E93' },
      'lp.whiteButton': { default: '#1C1C1E', _dark: '#FFFFFF' },
      'lp.blackText': { default: '#FFFFFF', _dark: '#000000' },
      'lp.accent': { default: '#0088CC', _dark: '#0088CC' },
      'lp.error': { default: '#FF3B30', _dark: '#FF3B30' },
      'lp.warning': { default: '#FFD700', _dark: '#FFD700' },
      'lp.success': { default: '#4CAF50', _dark: '#4CAF50' },
      'lp.badgeActiveBg': { default: '#D1FAE5', _dark: 'rgba(76, 175, 80, 0.22)' },
      'lp.badgeActiveText': { default: '#047857', _dark: '#8FE39A' },
      'lp.badgeInactiveBg': { default: '#FEE2E2', _dark: 'rgba(255, 59, 48, 0.22)' },
      'lp.badgeInactiveText': { default: '#B91C1C', _dark: '#FFB4AC' },
      'lp.badgeAccentBg': { default: '#E0E9A8', _dark: 'rgba(217, 229, 127, 0.22)' },
      'lp.badgeAccentText': { default: '#3F4D12', _dark: '#D9E57F' },
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
            opacity: 0.9,
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
