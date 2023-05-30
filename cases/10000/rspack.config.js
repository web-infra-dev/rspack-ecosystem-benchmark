const path = require("path");
const isProd = process.env.NODE_ENV === "production";
const { default: HtmlPlugin } = require("@rspack/plugin-html");
const HmrBenchmarkPlugin = require("./plugins/hmr-benchmark-plugin");
let index = 0;
console.log(isProd);
/** @type {import("@rspack/cli").Configuration} */
module.exports = {
	mode: isProd ? "production" : "development",
	resolve: {
		extensions: [".js", ".jsx"],
	},
	entry: { main: "./index.jsx" },
	builtins: {
		progress: {},
		html: [{ template: path.resolve(__dirname, "./index.html") }],
	},
	stats: {
		warnings: false,
	},
	experiments: {
		incrementalRebuild: true,
	},
	plugins: [
		new HmrBenchmarkPlugin(require('./common.config.js')),
	],
};
