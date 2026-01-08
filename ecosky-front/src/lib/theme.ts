import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  colors: {
    brand: {
      100: '#E6F6FE',
      500: '#3182CE',
      900: '#2A4365',
    },
    aviation: {
      50: '#E8F5FF',
      100: '#D1EBFF',
      500: '#3B82F6',
      900: '#1E3A8A',
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'xl',
      },
    },
  },
})