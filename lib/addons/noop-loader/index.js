import path from "path";
import { fileURLToPath } from "url";
import { Addon } from "../common.js";

const loaderPath = path.resolve(
	fileURLToPath(import.meta.url),
	"../loader.cjs"
);

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
config.module = config.module || {};
config.module.rules = config.module.rules || [];
config.module.rules.push({
  test: /\.[tj]sx?$/,
  use: [{
    loader: "${loaderPath}"
  }]
});
`;
	}
}
