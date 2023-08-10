import { Addon } from "./common.js";

export class ProdBuild extends Addon {
	async afterInstall(ctx) {
		ctx.rspackArgs.push("build", "--mode", "production");
	}
}
