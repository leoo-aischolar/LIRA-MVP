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
        lira: {
          bg: '#f7f5f2',
          card: '#fffaf4',
          accent: '#cf8f5f',
          text: '#2e2722',
          subtext: '#7a6f66',
        },
      },
      keyframes: {
        startFadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(14px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'start-title': 'startFadeIn 1000ms ease-out forwards',
        'start-secondary': 'startFadeIn 1000ms ease-out 1000ms forwards',
      },
    },
  },
  plugins: [],
};
