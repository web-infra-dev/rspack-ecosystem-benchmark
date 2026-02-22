export default {
	jobs: [
		"10000_development-mode",
		"10000_development-mode_hmr",
		"10000_production-mode",
		"10000_production-mode_persistent-cold",
		"10000_production-mode_persistent-hot",
		"10000_big_production-mode_disable-minimize",
		"10000_development-mode_noop-loader",
		"arco-pro_development-mode",
		"arco-pro_development-mode_hmr",
		"arco-pro_production-mode",
		"arco-pro_production-mode_persistent-cold",
		"arco-pro_production-mode_persistent-hot",
		"arco-pro_production-mode_traverse-chunk-modules",
		"arco-pro_production-mode_generate-package-json-webpack-plugin",
		"large-dyn-imports_development-mode",
		"large-dyn-imports_production-mode",
		"threejs_development-mode_10x",
		"threejs_development-mode_10x_hmr",
		"threejs_production-mode_10x",
		"threejs_production-mode_10x_persistent-cold",
		"threejs_production-mode_10x_persistent-hot",
		"bundled-threejs_development-mode",
		"bundled-threejs_production-mode"
	],
	rspackDirectory: process.env.RSPACK_DIR
};
