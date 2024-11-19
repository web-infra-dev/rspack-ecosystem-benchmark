const PLUGIN_NAME = "TraverseModuleGraphPlugin";

class TraverseModuleGraphPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				const entries = compilation.entries.values();

				const visitedModules = new Set();

				function traverse(dependency) {
					const module = compilation.moduleGraph.getModule(dependency);
					if (module) {
						visitedModules.add(module);
						for (const dep of module.dependencies) {
							traverse(dep)
						}
					}
				}

				for (const entry of entries) {
					for (const dependency of entry.dependencies) {
						traverse(dependency)
					}
				}

				console.log("Visited module number: ", visitedModules.size);
			});
		});
	}
}

module.exports = TraverseModuleGraphPlugin;
