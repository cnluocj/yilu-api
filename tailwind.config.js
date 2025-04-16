/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
        'primary-hover': '#0958d9',
        success: '#52c41a',
        'success-hover': '#389e0d',
        error: '#ff4d4f',
        'error-hover': '#cf1322',
        'text': '#333',
        'light-text': '#666',
        'border': '#eee',
        'background': '#f5f7fa',
        'card-bg': '#fff',
        'disabled-bg': '#f5f5f5',
        'disabled-text': '#bbb',
        'progress-bg': '#e6f4ff',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      transitionProperty: {
        'default': 'all 0.3s',
      },
    },
  },
  plugins: [],
}
