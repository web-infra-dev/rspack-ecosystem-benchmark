export default {
	jobs: [
		"10000_development-mode",
		"10000_development-mode_hmr",
		"10000_production-mode",
		"10000_big_production-mode_disable-minimize",
		"arco-pro_development-mode",
		"arco-pro_development-mode_hmr",
		"arco-pro_production-mode",
		"arco-pro_production-mode_traverse-chunk-modules",
		"arco-pro_production-mode_generate-package-json-webpack-plugin",
		"large-dyn-imports_development-mode",
		"large-dyn-imports_production-mode",
		"threejs_development-mode_10x",
		"threejs_development-mode_10x_hmr",
		"threejs_production-mode_10x"
	],
	rspackDirectory: process.env.RSPACK_DIR
};
