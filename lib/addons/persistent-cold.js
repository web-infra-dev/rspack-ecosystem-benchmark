import fs from "fs/promises";
import path from "path";
import { Addon } from "./common.js";

export default class extends Addon {
	async afterSetup(ctx) {
		await fs.rm(path.join(ctx.caseDir, "node_modules/.cache"), {
			recursive: true,
			force: true
		});
		ctx.config =
			ctx.config +
			`
module.exports.cache = true;
module.exports.experiments = module.exports.experiments || {}
module.exports.experiments.cache = { type: "persistent" }
`;
	}
}
