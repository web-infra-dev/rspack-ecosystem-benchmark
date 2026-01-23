import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
function interceptPlugin(compiler) {
	const logs = [];
	function intercept(hooks, skipList = []) {
		Object.keys(hooks).forEach(key => {
			if (typeof hooks[key].intercept === 'function' && skipList.every(skip => !key.startsWith(skip))) {
				hooks[key].intercept({
					call() {
						logs.push('hooks.' + key + '.intercept.call')
					}
				})
			}
		})
	}
	intercept(compiler.hooks);
	compiler.hooks.compilation.tap(interceptPlugin.name, (compilation) => {
		intercept(compilation.hooks, ['processAssets', 'additionalAssets'])
	})
}
			
config.plugins = config.plugins || [];
config.plugins.push(interceptPlugin)
`;
	}
}
