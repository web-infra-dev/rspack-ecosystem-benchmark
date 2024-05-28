const isScheduled = false;

// HMR will run 10 times in build plugin, so we should not start multiple instances of Rspack.
// However, we still need to run multiple instances of Rspack when executing scheduled tasks for longer runtimes.
const hmrRuns = isScheduled ? 10 : 1;

export default {
	jobs: [
		{
			name: "10000_development-mode",
			runs: 10
		},
		{
			name: "10000_development-mode_hmr",
			runs: hmrRuns
		},
		{
			name: "10000_production-mode",
			runs: 10
		},
		{
			name: "arco-pro_development-mode",
			runs: 10
		},
		{
			name: "arco-pro_development-mode_intercept-plugin",
			runs: 10
		},
		{
			name: "arco-pro_development-mode_hmr",
			runs: hmrRuns
		},
		{
			name: "arco-pro_development-mode_hmr_intercept-plugin",
			runs: hmrRuns
		},
		{
			name: "arco-pro_production-mode",
			runs: 10
		},
		{
			name: "arco-pro_production-mode_intercept-plugin",
			runs: 10
		},
		{
			name: "threejs_development-mode_10x",
			runs: 10
		},
		{
			name: "threejs_development-mode_10x_hmr",
			runs: hmrRuns
		},
		{
			name: "threejs_production-mode_10x",
			runs: 10
		}
	],
	rspackDirectory: process.env.RSPACK_DIR
};
