const path = require("path");
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackNotifierPlugin = require("webpack-notifier");

const package = require("./package.json");
const umdName = package["umdName"] || package["name"];
const externals = package["externalsForWebpack"] || [];
const targetFileName = path.basename(package["main"]);
const targetDirName = path.dirname(package["main"]);

var PROD = JSON.parse(process.env.PROD || false);

module.exports = {
  entry: "./src/index.ts",
  mode: "none",
  devtool: "source-map",
  plugins: [
    new WebpackNotifierPlugin({
      title: targetFileName,
      alwaysNotify: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ ".ts" ]
  },
  output: {
    filename: targetFileName,
    path: path.resolve(__dirname, targetDirName),
    library: umdName,
    libraryTarget: "umd",
    // Workaround for Webpack 4. See https://github.com/webpack/webpack/issues/6522#issuecomment-371120689
    globalObject: "typeof self !== \"undefined\" ? self : this"
  },
  externals: externals
};

if (PROD) {
  // https://webpack.js.org/concepts/mode/#mode-production
  module.exports.mode = "production";
  module.exports.optimization = {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
          // We actually only want to keep function arguments (for console
          // completion), but all the minifiers I've found group this with
          // mangling internal variable names. :-/
          // So we take the size hit. Apps will have to minify their final
          // builds if they want to save more on size.
          mangle: false
        },
      }),
    ]
  };
  module.exports.plugins.push(
    new webpack.NoEmitOnErrorsPlugin()
  );
}
