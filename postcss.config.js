// postcss.config.js
// Este archivo es CRÍTICO — sin él Tailwind no compila en el build de Netlify

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

module.exports = config
