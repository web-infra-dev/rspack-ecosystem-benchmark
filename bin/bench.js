import { resolve } from "path";
import { fileURLToPath } from "url";
import { mkdir, writeFile } from "fs/promises";
import actionsCore from "@actions/core";
import { run, formatResultTable } from "../lib/index.js";
import { isGitHubActions } from '../lib/utils.js';

const [, , ...benchmarkNames] = process.argv;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const defaultBenchmarkNames = [
	"10000_development-mode",
	"10000_development-mode_hmr",
	"10000_production-mode",
	"arco-pro_development-mode",
	"arco-pro_development-mode_intercept-plugin",
	"arco-pro_development-mode_hmr",
	"arco-pro_development-mode_hmr_intercept-plugin",
	"arco-pro_production-mode",
	"arco-pro_production-mode_intercept-plugin",
	"threejs_development-mode_10x",
	"threejs_development-mode_10x_hmr",
	"threejs_production-mode_10x"
];

(async () => {
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	const benchmarks = benchmarkNames.length
		? benchmarkNames
		: defaultBenchmarkNames;
	for (const item of benchmarks) {
		const start = Date.now();
		const result = await run(item);
		if (isGitHubActions) {
			actionsCore.startGroup(`${item} result is`);
		} else {
			console.log(`${item} result is`);
		}
		console.log(formatResultTable(result, { verbose: true }));
		if (isGitHubActions) {
			actionsCore.endGroup()
			const cost = Math.ceil((Date.now() - start) / 1000)
			console.log(`Cost for \`${item}\`: ${cost} s`)
		}

		await writeFile(
			resolve(rootDir, `output/${item}.json`),
			JSON.stringify(result, null, 2)
		);
	}
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
