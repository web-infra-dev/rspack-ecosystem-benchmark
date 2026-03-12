const path = require("path");
const rspack = require("@rspack/core");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? false : "source-map",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: isProduction ? "/rspack-ecosystem-benchmark/detail/" : "/",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true },
              transform: {
                react: {
                  runtime: "automatic",
                  development: !isProduction,
                  refresh: !isProduction,
                },
              },
            },
          },
        },
      },
      {
        test: /\.css$/,
        type: "css",
      },
    ],
  },
  plugins: [
    new rspack.DefinePlugin({
      RSPACK_BENCHMARK_API_URL: JSON.stringify(
        process.env.RSPACK_BENCHMARK_API_URL || ""
      ),
    }),
    new rspack.HtmlRspackPlugin({
      template: "./index.html",
      inject: "body",
      ...(isProduction
        ? {
            minify: true,
            scriptLoading: "blocking",
          }
        : {}),
    }),
    !isProduction && new (require("@rspack/plugin-react-refresh"))(),
  ].filter(Boolean),
  devServer: {
    port: 3000,
    hot: true,
  },
};
