import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#f7f7f7',
      100: '#e3e3e3',
      200: '#c7c7c7',
      300: '#a3a3a3',
      400: '#818181',
      500: '#666666',
      600: '#515151',
      700: '#434343',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.900',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'gray',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'gray.700',
      },
    },
  },
});

export default theme;
