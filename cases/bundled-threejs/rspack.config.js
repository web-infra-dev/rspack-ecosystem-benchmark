/** @type {import("@rspack/cli").Configuration} */
const config = {
	entry: { main: "./src/index.js" },
	optimization: {
		minimize:false,
		moduleIds: 'named'
	}
};

export default config;
