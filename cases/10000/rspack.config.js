const path = require("path");
const rspack = require("@rspack/core");

/** @type {import("@rspack/cli").Configuration} */
module.exports = {
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: { main: "./index.jsx" },
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: path.resolve(__dirname, "./index.html")
		})
	],
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
