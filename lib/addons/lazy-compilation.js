import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		process.env.NODE_ENV = "development";
		ctx.rspackArgs.push("dev");
		// Because lazy compilation must be dev mode.
		// we only can start a dev server one times.
		// so we set runTimes to 1.
		ctx.runTimes = 1;
		ctx.config =
			ctx.config +
			`
		config.devServer = config.devServer || {}
		config.devServer.devMiddleware = config.devServer.devMiddleware || {}
		config.devServer.devMiddleware.writeToDisk = true
		config.experiments = config.experiments || {}
		config.experiments.lazyCompilation = true
		`;
	}
}
