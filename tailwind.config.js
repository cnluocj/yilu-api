/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './public/**/*.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bae0fd',
          300: '#7cc6fb',
          400: '#36a6f2',
          500: '#0090ff',
          600: '#007bea',
          700: '#006adc',
          800: '#0053ad',
          900: '#0a4a90',
        },
        background: {
          light: '#FFFFFF',
          dark: '#000000',
        },
        content: {
          primary: '#000000',
          secondary: '#666666',
          light: '#FFFFFF',
          'light-secondary': '#A1A1A1',
        },
        border: {
          light: '#EAEAEA',
          dark: '#333333',
        },
        accent: {
          1: '#FAFAFA',
          2: '#EAEAEA',
          3: '#999999',
          4: '#888888',
          5: '#666666',
          6: '#444444',
          7: '#333333',
          8: '#111111',
        },
        success: {
          light: '#0070F3',
          dark: '#0761D1',
        },
        error: {
          light: '#FF0000',
          dark: '#E00000',
        },
        warning: {
          light: '#F5A623',
          dark: '#F49D1A',
        },
      },
      boxShadow: {
        'card': '0 4px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)',
        'btn': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'btn-hover': '0 5px 10px rgba(0, 0, 0, 0.1)',
      },
      transitionProperty: {
        'default': 'all',
      },
      transitionDuration: {
        'default': '200ms',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
