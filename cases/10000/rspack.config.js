import path from "node:path";
import { fileURLToPath } from "node:url";
import rspack from "@rspack/core";
import ReactRefreshPlugin from "@rspack/plugin-react-refresh";

const CSS_LOADER = {
	loader: "css-loader",
	options: {
		modules: { auto: true, namedExport: false, exportLocalsConvention: "as-is" }
	}
};

const prod = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** @type {import("@rspack/cli").Configuration} */
const config = {
	experiments: {
		css: false
	},
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: { main: "./index.jsx" },
	plugins: [
		new rspack.CssExtractRspackPlugin({
			filename: "static/css/[name].[contenthash:8].css",
			chunkFilename: "static/css/async/[name].[contenthash:8].css"
		}),
		new rspack.HtmlRspackPlugin({
			template: path.resolve(__dirname, "./index.html")
		}),
		!prod && new ReactRefreshPlugin()
	].filter(Boolean),
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "javascript/auto",
				sideEffects: true,
				use: [rspack.CssExtractRspackPlugin.loader, CSS_LOADER],
				resolve: { preferRelative: true }
			},
			{
				test: /\.(j|t)s$/,
				exclude: [/[\\/]node_modules[\\/]/],
				loader: "builtin:swc-loader",
				options: {
					jsc: {
						parser: {
							syntax: "typescript"
						},
						externalHelpers: true
					},
					env: {
						targets: "Chrome >= 48"
					}
				}
			},
			{
				test: /\.(j|t)sx$/,
				loader: "builtin:swc-loader",
				exclude: [/[\\/]node_modules[\\/]/],
				options: {
					jsc: {
						parser: {
							syntax: "typescript",
							tsx: true
						},
						transform: {
							react: {
								runtime: "automatic",
								development: !prod,
								refresh: !prod
							}
						},
						externalHelpers: true
					},
					env: {
						targets: "Chrome >= 48"
					}
				}
			}
		]
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				d1: {
					test: /\/d1\//
				}
			}
		}
	}
};

export default config;
