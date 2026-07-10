import './webpack.config.js'

// Override optimization
export default {
  ...(await import('fs').then(fs => JSON.parse(fs.readFileSync('./webpack.config.js', 'utf-8')))),
}
