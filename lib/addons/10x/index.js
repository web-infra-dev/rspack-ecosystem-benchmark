import path from "path";
import { fileURLToPath } from "url";
import { Addon } from "../common.js";

const loaderPath = path.resolve(
	fileURLToPath(import.meta.url),
	"../loader.cjs"
);

export default class extends Addon {
	options = {
		times: 10
	};
	async afterSetup(ctx) {
		// TODO use loader
		ctx.config =
			ctx.config +
			`
module.exports.module = module.exports.module || {};
module.exports.module.rules = module.exports.module.rules || [];
module.exports.module.rules.push({
  test: /\.[tj]sx?$/,
  use: [{
    loader: "${loaderPath}",
    options: ${JSON.stringify(this.options)}
  }]
});
`;
	}
}
