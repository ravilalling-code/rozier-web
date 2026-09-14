/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        rose: {
          50: 'var(--rose-50)',
          100: 'var(--rose-100)',
          500: 'var(--rose-500)',
          600: 'var(--rose-600)',
        },
        ink: {
          900: 'var(--ink-900)',
          950: 'var(--ink-950)',
        },
        warm: {
          100: 'var(--warm-100)',
          300: 'var(--warm-300)',
          500: 'var(--warm-500)',
        },
        accent: {
          carmine: 'var(--accent-carmine)',
        },
        success: 'var(--success)',
        error: 'var(--error)',
        'focus-ring': 'var(--focus-ring)',
      },
      boxShadow: {
        rose: 'var(--shadow-rose)',
      },
    },
  },
  plugins: [],
};
