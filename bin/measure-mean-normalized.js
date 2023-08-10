import { runBenchmark } from "../lib/index.js";
//import { formatResultTable, normalizeResult } from "../lib/utils.js";
//import { mkdir, writeFile } from "fs/promises";
// import { resolve } from "path";
// import { fileURLToPath } from "url";

const [, , caseName = "minimal", scenarioName = "development-build", runs = 1] =
	process.argv;

//const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
runBenchmark("minimal_development-build");
/*(async () => {
	// const normalResult1 = await measure(caseName, scenarioName, {
	// 	run: 1,
	// 	verboseSetup: true,
	// 	date: normalDate,
	// });
	const baseResult = await measure(caseName, scenarioName, {
		runs,
		  verboseSetup: true,
      install: false
	});
	// const normalResult2 = await measure(caseName, scenarioName, {
	// 	run: 1,
	// 	verboseSetup: true,
	// 	date: normalDate,
	// });
	const result = normalizeResult(
		baseResult,
		// TODO: we don't have stats data, 1 is the least placehold number we can't set
		1,
		// (normalResult1.stats.median + normalResult2.stats.median) / 2
	);
	console.log(formatResultTable(result, { colors: true, verbose: true }));
	await mkdir(resolve(rootDir, "output"), { recursive: true });
	await writeFile(
		resolve(rootDir, `output/${caseName}_${scenarioName}.json`),
		JSON.stringify(result, null, 2)
	);
})().catch((err) => {
	process.exitCode = 1;
	console.error(err.stack);
});*/
