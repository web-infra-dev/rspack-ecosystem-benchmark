import path from "path";
import url from "url";
import { Addon } from "../common.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pluginPath = path.join(__dirname, "plugin.cjs");

export default class extends Addon {
	async afterSetup(ctx) {
		ctx.clearCache = false;
		ctx.config =
			ctx.config +
			`
config.cache = { type: "persistent" };
config.plugins = config.plugins || [];
import PersistentHotPlugin from "${pluginPath}";
config.plugins.push(
	new PersistentHotPlugin()
);
`;
	}
}

export const HIT_RATE = "SwcJsMinimizerRspackPlugin.minimize persistent cache hit rate";
