/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./web/**/index.html"],
  theme: {
    fontSize: {
      heading: '3rem',
      'sub-heading': '2em',
      data: '1.5rem'
    },
    fontFamily: {
      mono: 'SpaceMono',
    },
    extend: {},
  },
  plugins: [],
}