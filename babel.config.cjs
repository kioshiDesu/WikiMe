module.exports = {
  presets: [
    ['@babel/preset-env', { targets: '> 0.5%, not dead, not ie 11' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    ['@babel/preset-typescript', { onlyRemoveTypeImports: true }],
  ],
}