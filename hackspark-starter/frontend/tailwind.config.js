export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rent: {
          50: '#eefafa',
          100: '#dcdedd',
          300: '#99a2a1',
          500: '#00989b',
          700: '#00585a',
          950: '#00181a'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(0, 24, 26, 0.08)'
      }
    }
  },
  plugins: []
};
