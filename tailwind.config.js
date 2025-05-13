/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'japanese': [
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic Pro"',
          '"Yu Gothic"',
          '"YuGothic"',
          '"Meiryo"',
          '"MS PGothic"',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
}
