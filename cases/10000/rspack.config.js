const path = require("path");
/** @type {import("@rspack/cli").Configuration} */
module.exports = {
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: { main: "./index.jsx" },
	builtins: {
		html: [{ template: path.resolve(__dirname, "./index.html") }]
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
