/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        karvion: {
          bg: '#070607',
          card: '#0f0c0e',
          'card-hover': '#161114',
          border: '#24161b',
          'border-active': '#ef4444',
          crimson: '#ef4444',
          'crimson-bright': '#f43f5e',
          'crimson-dark': '#991b1b',
          ruby: '#dc2626',
          muted: '#8e7f84',
          glow: 'rgba(239, 68, 68, 0.25)',
        },
      },
      boxShadow: {
        'crimson-glow': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'crimson-sm': '0 0 10px rgba(239, 68, 68, 0.25)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
