import type { Config } from 'tailwindcss';

export default <Partial<Config>>{
  content: ['./components/**/*.{js,vue,ts}', './layouts/**/*.vue', './pages/**/*.vue', './plugins/**/*.{js,ts}', './nuxt.config.{js,ts}', './app.vue'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        primary: {
          light: '#4ade80',
          DEFAULT: process.env.PRIMARY_COLOR || '#16a34a',
          dark: '#16a34a',
        },
      },
      aspectRatio: {
        '9/8': '1 / 1.125',
      },
      screens: {
        '2xl': '1400px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
