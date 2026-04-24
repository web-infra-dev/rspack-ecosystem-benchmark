import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.clearCache = false;
		ctx.config =
			ctx.config +
			`
config.cache = { type: "persistent" };
`;
	}
}
