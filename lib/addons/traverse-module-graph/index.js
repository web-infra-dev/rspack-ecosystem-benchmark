import path from "path";
import { Addon } from "../common.js";

export default class extends Addon {
	options = {
		times: 10
	};
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
module.exports.plugins = module.exports.plugins || [];
const TraverseModuleGraphPlugin = require("${path.join(__dirname, 'plugin.js')}");
module.exports.plugins.push(new TraverseModuleGraphPlugin());
`;
	}
}
