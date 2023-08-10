import { Addon } from "./common.js";

export class DevBuild extends Addon {
	async afterInstall(ctx) {
		ctx.rspackArgs.push("build", "--mode", "development");
	}
}
