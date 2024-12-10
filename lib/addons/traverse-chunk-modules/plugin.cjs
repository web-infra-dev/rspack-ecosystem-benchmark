const PLUGIN_NAME = "TraverseChunkModulesPlugin";

class TraverseChunkModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
				const visitedModules = new Set();

				for (const chunk of compilation.chunks.values()) {
					const modules = compilation.chunkGraph.getChunkModulesIterable(chunk);
					for (const module of modules) {
						if (modules in module) {
							for (const subModule of module.modules) {
								visitedModules.add(subModule);
							}
						} else {
							visitedModules.add(module);
						}
					}
				}

				console.log('visited modules number', visitedModules.size);
			});
		});
	}
}

module.exports = TraverseChunkModulesPlugin;
