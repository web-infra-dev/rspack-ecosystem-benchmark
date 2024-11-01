import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
module.exports.optimization = module.exports.optimization || {}
module.exports.optimization.minimize = false
`;
	}
}
