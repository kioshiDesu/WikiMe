import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import atImport from 'postcss-import'

export default {
  plugins: [atImport(), tailwindcss(), autoprefixer()],
}
