import { theme } from './src/lib/theme'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...theme.colors,
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...theme.fonts.body],
      },
    },
  },
  plugins: [],
}

export default config