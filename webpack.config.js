const path = require('path');
  const TerserPlugin = require('terser-webpack-plugin');
  const package = require('./package.json');
  
  module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
      entry: './src/rockty-tokenizer-sdk.js',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProduction ? 'rockty-payments-sdk.min.js' : 'rockty-tokenizer-sdk.js',
        library: 'RocktyPaymentsSDK',
        libraryTarget: 'umd',
        libraryExport: 'default',
        globalObject: 'this'
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          }
        ]
      },
      optimization: {
        minimize: isProduction,
        minimizer: [
          new TerserPlugin({
            extractComments: false,
            terserOptions: {
              format: {
                comments: false,
              },
              compress: {
                drop_console: false,
              },
            },
          }),
        ],
      },
      devtool: isProduction ? false : 'source-map'
    };
  };