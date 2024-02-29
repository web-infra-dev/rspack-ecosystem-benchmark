import { resolve } from "path";
import { fileURLToPath } from "url";
import { mkdir, writeFile } from "fs/promises";
import { run, formatResultTable } from "../lib/index.js";

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
		const result = await run(item);
		console.log(`${item} result is:`);
		console.log(formatResultTable(result, { verbose: true }));
		await writeFile(
			resolve(rootDir, `output/${item}.json`),
			JSON.stringify(result, null, 2)
		);
	}
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
