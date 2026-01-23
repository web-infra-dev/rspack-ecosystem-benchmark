import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
config.optimization = config.optimization || {}
config.optimization.minimize = false
`;
	}
}
