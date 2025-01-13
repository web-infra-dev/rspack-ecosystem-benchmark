import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
    ctx.clearCache = false;
		ctx.config =
			ctx.config +
			`
module.exports.cache = true;
module.exports.experiments = module.exports.experiments || {}
module.exports.experiments.cache = { type: "persistent" }
`;
	}
}
