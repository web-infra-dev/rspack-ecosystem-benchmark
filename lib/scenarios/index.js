import path from "path";
import { readFile, unlink, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import actionsCore from "@actions/core";
import { isGitHubActions, runCommand, openPage } from "../utils.js";
import {
	getDirSizes,
	calcStatistics,
	clearCaches,
	getHmrConfig
} from "./utils.js";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../../..");

async function runRspack(ctx) {
	let start = Date.now();
	let rebuild_start;
	let counter = 0;
	let dataSetCounter = -1;
	let promise = Promise.resolve();
	let data = {};
	const processLine = line => {
		if (line === "#!# start") {
			start = Date.now();
			dataSetCounter = 0;
			// In HMR benchmark cases, startup time should be excluded from statistics
			data = {};
		} else if (line === "#!# next") {
			promise = promise.then(async () => {
				counter++;
				if (dataSetCounter >= 0) dataSetCounter++;
				for (const item of ctx.hmrConfig) {
					const content = item.generateContent(
						ctx.originalFiles[item.rebuildChangeFile],
						counter
					);
					await writeFile(item.rebuildChangeFile, content);
				}
			});
		} else if (line === '#!# dev') {
			promise = promise.then(async () => {
				const host = '0.0.0.0';
				const port = 8080;
				const url = `http://${host}:${port}`;
				await openPage(url);

				rebuild_start = Date.now();
			});
		} else if (line.startsWith("#!#")) {
			const [, name, valueStr] = /^#!# (.+) = ((\d|\.|e|-)+)$/.exec(line);
			data[name] = (data[name] || 0) + +valueStr;
		}
	};
	let remainingLine = "";

	const rspackCliDir = path.join(rootDir, "node_modules/@rspack/cli");
	const packageJsonPath = path.join(rspackCliDir, "package.json");
	const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
	const bin = path.resolve(rspackCliDir, packageJson.bin.rspack);

	await runCommand(bin, ctx.rspackArgs, {
		verbose: false,
		onData: (chunk) => {
			const lines = (remainingLine + chunk).split("\n");
			remainingLine = lines.pop();
			lines.forEach(processLine);
		},
		env: {
			NODE_OPTIONS: "--max-old-space-size=8192"
		}
	});

	data.exec = Date.now() - start;
	if (rebuild_start) {
		data.execRebuild = Date.now() - rebuild_start;
	}
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
				clearCache: true,
				runTimes: 5,
				timeout: 5 * 60 * 1000,
				runData: [],
				result: {}
			};
		},
		async generate(ctx) {
			if (isGitHubActions) {
				actionsCore.startGroup("Generating rspack configuration:");
				console.log(ctx.config);
				actionsCore.endGroup();
			}

			await writeFile(
				path.resolve(ctx.caseDir, "rspack.config.js"),
				ctx.config
			);
			const rspackDir =
				process.env.RSPACK_DIR || path.resolve(rootDir, ".rspack");
			console.log("Create Rspack package link");
			await runCommand("mkdir", [
				"-p",
				path.resolve(rootDir, "node_modules/@rspack")
			]);
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
			console.log("Warmup Rspack with args:", ctx.rspackArgs);

			await runRspack({
				...ctx,
				rspackArgs: ctx.rspackArgs.filter(a => a !== "--watch").filter(a => a !== "dev")
			});
		},
		async run(ctx) {
			console.log("Run Rspack with args:", ctx.rspackArgs);

			const start = Date.now();
			for (let i = 0; i < ctx.runTimes; i++) {
				if (ctx.clearCache) {
					await clearCaches(ctx.caseDir);
				}

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
