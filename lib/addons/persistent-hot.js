import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.clearCache = false;
		ctx.config =
			ctx.config +
			`
config.cache = true;
config.experiments = config.experiments || {}
config.experiments.cache = { type: "persistent" }
`;
	}
}
