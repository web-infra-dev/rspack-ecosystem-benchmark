import { Addon } from "./common.js";

export class DevRebuild extends Addon {
	async afterInstall(ctx) {
		ctx.rspackArgs.push("build", "--mode", "development", "--watch");
	}
}
