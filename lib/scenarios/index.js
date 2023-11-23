import path from "path";
import { readFile, unlink, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { runCommand } from "../utils.js";
import {
	getDirSizes,
	calcStatistics,
	clearCaches,
	getHmrConfig
} from "./utils.js";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../../..");

async function runRspack(ctx) {
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
				for (const item of ctx.hmrConfig) {
					const content = item.generateContent(
						ctx.originalFiles[item.rebuildChangeFile],
						counter
					);
					await writeFile(item.rebuildChangeFile, content);
				}
			});
		} else if (line.startsWith("#!#")) {
			const [, name, valueStr] = /^#!# (.+) = ((\d|\.|e|-)+)$/.exec(line);
			data[name] = (data[name] || 0) + +valueStr;
		}
	};
	let remainingLine = "";
	await runCommand(
		path.resolve(rootDir, "./node_modules/@rspack/cli/bin/rspack"),
		ctx.rspackArgs,
		{
			verbose: false,
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
	data["dist size"] = await getDirSizes("dist");
	return data;
}

export function getScenario(caseName) {
	return {
		async setup() {
			const caseDir = path.resolve(rootDir, "cases", caseName);
			process.chdir(caseDir);
			const configFilePath = path.resolve(caseDir, "rspack.config.js");
			const config = await readFile(configFilePath);
			const hmrConfig = await getHmrConfig(path.resolve(caseDir, "hmr.js"));
			return {
				caseDir,
				originalFiles: {
					[configFilePath]: config,
					...hmrConfig.originalFiles
				},
				config: `${config}
module.exports.plugins = module.exports.plugins || [];
module.exports.plugins.push(new (require("../../lib/scenarios/build-plugin.cjs"))());`,
				hmrConfig: hmrConfig.config,
				rspackArgs: [],
				runTimes: 10,
				timeout: 5 * 60 * 1000,
				runData: [],
				result: {}
			};
		},
		async generate(ctx) {
			console.log("generate rspack config:");
			console.log("```");
			console.log(ctx.config);
			console.log("```");
			await writeFile(
				path.resolve(ctx.caseDir, "rspack.config.js"),
				ctx.config
			);
			const rspackDir =
				process.env.RSPACK_DIR || path.resolve(rootDir, ".rspack");
			console.log("create rspack package link");
			await runCommand("ln", [
				"-nsf",
				path.resolve(rspackDir, "packages/rspack"),
				path.resolve(rootDir, "node_modules/@rspack/core")
			]);
			await runCommand("ln", [
				"-nsf",
				path.resolve(rspackDir, "packages/rspack-cli"),
				path.resolve(rootDir, "node_modules/@rspack/cli")
			]);
		},
		async warmup(ctx) {
			console.log("run rspack with args:", ctx.rspackArgs);
			await runRspack({
				...ctx,
				rspackArgs: ctx.rspackArgs.filter(a => a !== "--watch")
			});
		},
		async run(ctx) {
			const start = Date.now();
			for (let i = 0; i < ctx.runTimes; i++) {
				await clearCaches(ctx.caseDir);

				ctx.runData.push(await runRspack(ctx));

				const runtime = Date.now() - start;
				if (runtime > ctx.timeout) break;
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
