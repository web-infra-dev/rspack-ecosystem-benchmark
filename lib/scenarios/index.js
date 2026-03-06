import path from "path";
import { readFile, unlink, writeFile, rm } from "fs/promises";
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

/**
 * Parse a time string from rspack logger tracing output.
 * Handles formats: "12.1µs", "3.17ms", "1.23s", "834ns"
 */
function parseTimeStr(s) {
	s = s.trim();
	if (s.endsWith("ms")) return parseFloat(s);
	if (s.includes("µs") || s.includes("us")) return parseFloat(s) / 1000;
	if (s.endsWith("ns")) return parseFloat(s) / 1000000;
	if (s.endsWith("s")) return parseFloat(s) * 1000;
	return 0;
}

/**
 * Parse rspack trace file (RSPACK_TRACE_LAYER=logger format).
 * Each line is a JSON object with fields.time.busy for span durations.
 */
async function parseTraceFile(traceFilePath) {
	const durations = {};
	try {
		const content = await readFile(traceFilePath, "utf-8");
		const lines = content.split("\n").filter(Boolean);
		for (const line of lines) {
			let obj;
			try { obj = JSON.parse(line); } catch { continue; }
			const fields = obj.fields;
			if (!fields || fields.message !== "close" || !fields["time.busy"]) continue;

			const span = obj.span;
			if (!span || !span.name) continue;

			const busyMs = parseTimeStr(fields["time.busy"]);
			if (busyMs <= 0) continue;

			const name = `trace.${span.name}`;
			durations[name] = (durations[name] || 0) + busyMs;
		}
	} catch {
		// Trace file not found or read error — skip silently
	}
	return durations;
}

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
		} else if (line === "#!# dev") {
			promise = promise.then(async () => {
				const host = "0.0.0.0";
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

	const traceFile = path.resolve(process.cwd(), `rspack-trace-${Date.now()}.json`);

	await runCommand(bin, ctx.rspackArgs, {
		verbose: false,
		onData: chunk => {
			const lines = (remainingLine + chunk).split("\n");
			remainingLine = lines.pop();
			lines.forEach(processLine);
		},
		env: {
			NODE_OPTIONS: "--max-old-space-size=8192",
			RSPACK_PROFILE: "OVERVIEW",
			RSPACK_TRACE_LAYER: "logger",
			RSPACK_TRACE_OUTPUT: traceFile
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

	// Parse tracing data and merge into data
	const traceDurations = await parseTraceFile(traceFile);
	Object.assign(data, traceDurations);
	await rm(traceFile, { force: true }).catch(() => {});

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
config.plugins = config.plugins || [];
import BuildPlugin from "../../lib/scenarios/build-plugin.js";
config.plugins.push(new BuildPlugin());`,
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
				rspackArgs: ctx.rspackArgs
					.filter(a => a !== "--watch")
					.filter(a => a !== "dev")
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
