export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s steps(1) infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, 0.15), 0 20px 60px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};