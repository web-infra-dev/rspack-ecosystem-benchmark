import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.rspackArgs.push("--watch");
		ctx.config =
			ctx.config +
			`
module.exports.devServer = module.exports.devServer || {}
module.exports.devServer.hot = true
`;
	}
}
