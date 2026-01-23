import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.rspackArgs.push("--watch");
		ctx.config =
			ctx.config +
			`
config.devServer = config.devServer || {}
config.devServer.hot = true
`;
	}
}
