import path from "path";
import url from "url";
import { Addon } from "../common.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pluginPath = path.join(__dirname, "plugin.cjs");

export default class extends Addon {
	options = {
		times: 10
	};
	async afterSetup(ctx) {
		ctx.config =
			ctx.config +
			`
config.plugins = config.plugins || [];
import TraverseChunkGraphPlugin from "${pluginPath}";
config.plugins.push(new TraverseChunkGraphPlugin());
`;
	}
}
