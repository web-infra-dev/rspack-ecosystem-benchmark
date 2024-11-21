import path from "path";
import url from "url";
import { Addon } from "../common.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default class extends Addon {
	options = {
		times: 10
	};
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
module.exports.plugins = module.exports.plugins || [];
const TraverseModuleGraphPlugin = require("${path.join(__dirname, 'plugin.cjs')}");
module.exports.plugins.push(new TraverseModuleGraphPlugin());
`;
	}
}
