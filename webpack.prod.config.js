var path = require('path');
var merge = require('webpack-merge').merge;
var commonConfiguration = require('./webpack.config.js');
var TerserPlugin = require('terser-webpack-plugin');
var CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = merge(commonConfiguration, {
  output: {
    library: 'AFRAME',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: 'aframe-master.min.js'
  },
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin(),
      new TerserPlugin({
        terserOptions: {
          compress: {
            passes: 1
          },
          format: {
            comments: false
          },
          toplevel: true
        },
        extractComments: false
      }),
    ]
  }
});
