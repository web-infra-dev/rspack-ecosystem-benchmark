import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.rspackArgs.push("build", "--mode", "production");
	}
}
