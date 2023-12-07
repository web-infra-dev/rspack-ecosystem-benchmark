import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		process.env.NODE_ENV = "production";
		ctx.rspackArgs.push("build", "--mode", "production");
	}
}
