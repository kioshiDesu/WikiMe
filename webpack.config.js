import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const isDev = process.env.NODE_ENV !== 'production'

export default {
  entry: './src/main.tsx',
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: '> 0.5%, not dead, not ie 11' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
    ...(isDev ? [] : [new MiniCssExtractPlugin({ filename: 'styles.css' })]),
  ],
  devServer: {
    port: 5173,
    hot: true,
    historyApiFallback: true,
  },
}
