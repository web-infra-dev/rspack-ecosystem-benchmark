const { format } = require("node:util");
const { HIT_RATE } = require("./index.js");

const PLUGIN_NAME = "RecordCacheHitRatePlugin";
const LOGGER_NAME = "rspack.SwcJsMinimizerRspackPlugin";
const LOGGING_DEBUG = [/rspack\.SwcJsMinimizerRspackPlugin/];
const LOG_REGEXP = /^minimize persistent cache: (\d+) hit(?:s)?, (\d+) miss(?:es)?$/;

class RecordCacheHitRatePlugin {
	apply(compiler) {
		compiler.hooks.done.tap(PLUGIN_NAME, stats => {
			const { logging } = stats.toJson({
				all: false,
				loggingDebug: LOGGING_DEBUG,
			});
			const entries = logging?.[LOGGER_NAME]?.entries || [];

			for (const entry of entries) {
				if (entry.type !== "log") continue;

				const logMessage = entry.message || (entry.args?.length ? format(entry.args[0], ...entry.args.slice(1)) : "");
				const match = LOG_REGEXP.exec(logMessage);
				if (!match) continue;

				const hits = +match[1];
				const misses = +match[2];
				const total = hits + misses;
				if (total === 0) return;

				console.log(`#!# ${HIT_RATE} = ${hits / total}`);
				return;
			}
		});
	}
}

module.exports = RecordCacheHitRatePlugin;
