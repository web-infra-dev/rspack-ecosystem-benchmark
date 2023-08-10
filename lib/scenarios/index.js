import path from "path";
import { readFile, unlink, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import {
	readFileSizes,
	clearCaches,
	runCommand,
	calcStatistics
} from "../utils.js";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../../..");

async function runRspack(rspackArgs) {
	let start = Date.now();

	let counter = 0;
	let dataSetCounter = -1;
	let promise = Promise.resolve();
	const data = {};
	const processLine = line => {
		if (line === "#!# start") {
			start = Date.now();
			dataSetCounter = 0;
		} else if (line === "#!# next") {
			promise = promise.then(async () => {
				counter++;
				if (dataSetCounter >= 0) dataSetCounter++;
				await new Promise(r => setTimeout(r, Math.max(300, 1000 / counter)));
				//					await alterFile(rebuildChangeFile, (content) =>
				//						content.replace(/Hello World\d*/, `Hello World${counter}`),
				//					);
			});
		} else if (line.startsWith("#!#")) {
			const [, name, valueStr] = /^#!# (.+) = ((\d|\.|e|-)+)$/.exec(line);
			data[name] = (data[name] || 0) + +valueStr;
		}
	};
	let remainingLine = "";
	await runCommand(
		path.resolve(rootDir, "./node_modules/.bin/rspack"),
		rspackArgs,
		{
			onData: function (chunk) {
				const lines = (remainingLine + chunk).split("\n");
				remainingLine = lines.pop();
				lines.forEach(processLine);
			}
		}
	);

	data.exec = Date.now() - start;
	await promise;
	if (dataSetCounter > 1) {
		for (const key of Object.keys(data)) {
			data[key] /= dataSetCounter;
		}
	}
	Object.assign(data, await readFileSizes("dist"));
	return data;
}

export function getScenario(caseName) {
	return {
		async setup() {
			const caseDir = path.resolve(rootDir, "cases", caseName);
			process.chdir(caseDir);
			const configFilePath = path.resolve(caseDir, "rspack.config.js");
			const config = await readFile(configFilePath);
			return {
				caseDir,
				originalFiles: {
					[configFilePath]: config
				},
				config: `${config}
module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/scenarios/build-plugin.cjs"))());`,
				rspackArgs: [],
				runs: 20,
				timeout: 5 * 60 * 1000,
				runData: [],
				result: {}
			};
		},
		async generate(ctx) {
			console.log("finial rspack config is");
			console.log(ctx.config);
			await writeFile(
				path.resolve(ctx.caseDir, "rspack.config.js"),
				ctx.config
			);
		},
		async warmup(ctx) {
			await runRspack(ctx.rspackArgs.filter(a => a !== "--watch"));
		},
		async run(ctx) {
			const { runs, timeout, rspackArgs, runData } = ctx;

			const start = Date.now();
			for (let i = 0; i < runs; i++) {
				await clearCaches(ctx.caseDir);

				runData.push(await runRspack(rspackArgs));

				const runtime = Date.now() - start;
				if (runtime > timeout) break;
			}
		},
		async statistic(ctx) {
			ctx.result = calcStatistics(ctx.runData);
		},
		async teardown(ctx) {
			Promise.all(
				Object.entries(ctx.originalFiles).map(async ([path, content]) => {
					if (content == null) {
						return unlink(path);
					}
					return writeFile(path, content);
				})
			);
			process.chdir(rootDir);
		}
	};
}
